'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceNarrationService } from '../services/voice-narration.service'

export interface PanelAudioLike {
  id: string
  narrativeText: string
  audioUrl?: string | null
  imageUrl?: string | null
}

export interface UseNarrationResult {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
  panelAudioUrls: Map<string, string>
  currentAudioUrl: string | null | undefined
  isPlaying: boolean
  isAutoPlayMode: boolean
  setIsAutoPlayMode: (v: boolean) => void
  isGeneratingAudio: boolean
  generatingPanelId: string | null
  audioGenerationProgress: number
  audioError: string | null
  generateAllNarration: () => Promise<void>
  regeneratePanelAudio: (panelIndex: number) => Promise<void>
  togglePlayPause: () => void
  startCinematicMode: () => Promise<void>
  handleAudioEnded: () => void
  handleAudioError: () => void
  setIsPlaying: (v: boolean) => void
}

/**
 * Owns audio narration for the comic finale: per-panel TTS URL cache, batch
 * generation, per-panel regeneration, play/pause state, autoplay sequencing
 * across panels, the hidden <audio> element ref, and error reporting.
 *
 * Panels are navigated by the parent — this hook accepts currentPanelIndex
 * and coordinates auto-advance via the onAdvancePanel callback.
 */
export function useNarration({
  panels,
  genre,
  currentPanelIndex,
  onAdvancePanel,
  onPanelAudioChange,
  navigationBlocked,
}: {
  panels: PanelAudioLike[]
  genre: string
  currentPanelIndex: number
  onAdvancePanel: (newIndex: number) => void
  onPanelAudioChange?: (panelIndex: number, audioUrl: string | null) => void
  navigationBlocked: boolean
}): UseNarrationResult {
  const [panelAudioUrls, setPanelAudioUrls] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>()
    panels.forEach((p) => {
      if (p.audioUrl) initial.set(p.id, p.audioUrl)
    })
    return initial
  })
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [generatingPanelId, setGeneratingPanelId] = useState<string | null>(null)
  const [audioGenerationProgress, setAudioGenerationProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAutoPlayMode, setIsAutoPlayMode] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const totalPanels = panels.length
  const currentPanel = panels[currentPanelIndex]
  const currentAudioUrl = panelAudioUrls.get(currentPanel?.id || '') || currentPanel?.audioUrl

  const generateAllNarration = useCallback(async () => {
    if (isGeneratingAudio) return

    setIsGeneratingAudio(true)
    setAudioGenerationProgress(0)
    setAudioError(null)

    const newAudioUrls = new Map(panelAudioUrls)
    let errorCount = 0

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i]
      setGeneratingPanelId(panel.id)

      if (newAudioUrls.has(panel.id) || panel.audioUrl) {
        setAudioGenerationProgress(((i + 1) / panels.length) * 100)
        continue
      }

      try {
        const result = await VoiceNarrationService.generateNarration(panel.narrativeText, genre)
        if (result.audioUrl) {
          newAudioUrls.set(panel.id, result.audioUrl)
          onPanelAudioChange?.(i, result.audioUrl)
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`Failed to generate audio for panel ${i + 1}:`, error)
        errorCount++
      }

      setAudioGenerationProgress(((i + 1) / panels.length) * 100)
    }

    setPanelAudioUrls(newAudioUrls)
    setIsGeneratingAudio(false)
    setGeneratingPanelId(null)

    if (errorCount > 0) {
      setAudioError(`Failed to generate ${errorCount} of ${panels.length} panels`)
    }
  }, [panels, genre, isGeneratingAudio, panelAudioUrls, onPanelAudioChange])

  const regeneratePanelAudio = useCallback(
    async (panelIndex: number) => {
      const panel = panels[panelIndex]
      if (!panel || generatingPanelId) return

      setGeneratingPanelId(panel.id)
      setAudioError(null)

      try {
        const result = await VoiceNarrationService.generateNarration(panel.narrativeText, genre, { force: true })
        if (result.audioUrl) {
          setPanelAudioUrls((prev) => {
            const updated = new Map(prev)
            updated.set(panel.id, result.audioUrl!)
            return updated
          })
          onPanelAudioChange?.(panelIndex, result.audioUrl)
        } else {
          setAudioError('Failed to regenerate audio')
        }
      } catch (error) {
        console.error(`Failed to regenerate audio for panel ${panelIndex + 1}:`, error)
        setAudioError('Failed to regenerate audio')
      }

      setGeneratingPanelId(null)
    },
    [panels, genre, generatingPanelId, onPanelAudioChange]
  )

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentAudioUrl) return

    setAudioError(null)
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Audio playback failed:', err)
        setAudioError('Audio playback failed')
      })
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentAudioUrl])

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
    if (isAutoPlayMode && currentPanelIndex < totalPanels - 1) {
      onAdvancePanel(currentPanelIndex + 1)
    } else if (isAutoPlayMode && currentPanelIndex === totalPanels - 1) {
      setIsAutoPlayMode(false)
    }
  }, [isAutoPlayMode, currentPanelIndex, totalPanels, onAdvancePanel])

  const handleAudioError = useCallback(() => {
    setIsPlaying(false)
    setAudioError('Audio playback error')
  }, [])

  const startCinematicMode = useCallback(async () => {
    const generatedCount = panelAudioUrls.size + panels.filter((p) => p.audioUrl).length
    if (generatedCount < panels.length) {
      await generateAllNarration()
    }
    onAdvancePanel(0)
    setIsAutoPlayMode(true)
  }, [panels, panelAudioUrls.size, generateAllNarration, onAdvancePanel])

  // Pre-generate first panel audio on mount (faster cinematic mode entry)
  useEffect(() => {
    const firstPanel = panels[0]
    if (!firstPanel || panelAudioUrls.has(firstPanel.id) || firstPanel.audioUrl) return
    VoiceNarrationService.generateNarration(firstPanel.narrativeText, genre)
      .then((result) => {
        if (result.audioUrl) {
          setPanelAudioUrls((prev) => {
            const updated = new Map(prev)
            updated.set(firstPanel.id, result.audioUrl!)
            return updated
          })
          onPanelAudioChange?.(0, result.audioUrl)
        }
      })
      .catch(() => {
        /* silent — will retry when user taps cinematic */
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prefetch next panel assets
  useEffect(() => {
    if (currentPanelIndex < totalPanels - 1) {
      const nextPanel = panels[currentPanelIndex + 1]
      if (nextPanel.imageUrl) {
        const img = new Image()
        img.src = nextPanel.imageUrl
      }
      const nextAudioUrl = panelAudioUrls.get(nextPanel.id) || nextPanel.audioUrl
      if (nextAudioUrl) {
        const audio = new Audio()
        audio.src = nextAudioUrl
        audio.preload = 'auto'
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPanelIndex, panels, panelAudioUrls])

  // Spacebar toggles playback when the current panel has narration
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (navigationBlocked) return
      if (e.code === 'Space' && currentAudioUrl) {
        e.preventDefault()
        togglePlayPause()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [currentAudioUrl, togglePlayPause, navigationBlocked])

  // Auto-play audio when panel changes in auto-play mode
  useEffect(() => {
    if (isAutoPlayMode && currentAudioUrl && audioRef.current) {
      audioRef.current.src = currentAudioUrl
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error('Auto-play failed:', err)
          setAudioError('Auto-play failed')
          setIsAutoPlayMode(false)
        })
    }
  }, [currentPanelIndex, isAutoPlayMode, currentAudioUrl])

  // Update audio source on manual navigation; clear error on panel change
  useEffect(() => {
    if (audioRef.current && currentAudioUrl && !isAutoPlayMode) {
      audioRef.current.src = currentAudioUrl
      setIsPlaying(false)
    }
    setAudioError(null)
  }, [currentPanelIndex, currentAudioUrl, isAutoPlayMode])

  return {
    audioRef,
    panelAudioUrls,
    currentAudioUrl,
    isPlaying,
    isAutoPlayMode,
    setIsAutoPlayMode,
    isGeneratingAudio,
    generatingPanelId,
    audioGenerationProgress,
    audioError,
    generateAllNarration,
    regeneratePanelAudio,
    togglePlayPause,
    startCinematicMode,
    handleAudioEnded,
    handleAudioError,
    setIsPlaying,
  }
}

/* ─── Narration toolbar (button row in the footer) ──────────────────────── */

export function NarrationControls({
  narration,
  panels,
  currentPanelId,
  currentPanelIndex,
  primaryColor,
}: {
  narration: UseNarrationResult
  panels: PanelAudioLike[]
  currentPanelId: string | undefined
  currentPanelIndex: number
  primaryColor: string
}) {
  const {
    panelAudioUrls,
    currentAudioUrl,
    isPlaying,
    isAutoPlayMode,
    setIsAutoPlayMode,
    isGeneratingAudio,
    generatingPanelId,
    audioGenerationProgress,
    audioError,
    generateAllNarration,
    regeneratePanelAudio,
    togglePlayPause,
    startCinematicMode,
  } = narration

  return (
    <>
      {audioError && (
        <span className="text-xs text-red-400 px-2 py-1 bg-red-500/10 rounded">{audioError}</span>
      )}

      {panelAudioUrls.size === 0 && !panels.some((p) => p.audioUrl) ? (
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void generateAllNarration()}
          disabled={isGeneratingAudio}
          title="Generate voice narration for all panels (Spacebar to play/pause)"
        >
          {isGeneratingAudio ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {Math.round(audioGenerationProgress)}%
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              Narration
            </>
          )}
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            className="gap-2"
            onClick={togglePlayPause}
            disabled={!currentAudioUrl || generatingPanelId === currentPanelId}
            title={isPlaying ? 'Pause narration (Space)' : 'Play narration (Space)'}
            aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
          >
            {generatingPanelId === currentPanelId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {generatingPanelId === currentPanelId ? 'Generating...' : isPlaying ? 'Pause' : 'Play'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => void regeneratePanelAudio(currentPanelIndex)}
            disabled={!!generatingPanelId || isAutoPlayMode}
            title="Regenerate audio for this panel"
            aria-label="Regenerate narration for current panel"
          >
            🔄
          </Button>

          <Button
            variant={isAutoPlayMode ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => (isAutoPlayMode ? setIsAutoPlayMode(false) : void startCinematicMode())}
            disabled={isGeneratingAudio}
            style={{
              backgroundColor: isAutoPlayMode ? primaryColor : undefined,
              borderColor: primaryColor,
            }}
            title={isAutoPlayMode ? 'Stop cinematic mode' : 'Start cinematic auto-play'}
            aria-pressed={isAutoPlayMode}
          >
            {isGeneratingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isAutoPlayMode ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            {isAutoPlayMode ? 'Stop' : 'Cinematic'}
          </Button>
        </>
      )}
    </>
  )
}
