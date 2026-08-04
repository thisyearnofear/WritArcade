'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Download, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface VideoShowcasePanel {
  id: string
  panelIndex: number
  narrativeText: string
  videoUrl: string | null
  imageUrl?: string | null
}

export interface VideoShowcaseProps {
  panels: VideoShowcasePanel[]
  primaryColor?: string
  gameTitle: string
  autoPlay?: boolean
}

export function VideoShowcase({ panels, primaryColor = '#8b5cf6', gameTitle, autoPlay = false }: VideoShowcaseProps) {
  const validPanels = panels.filter((p) => p.videoUrl)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentPanel = validPanels[currentIndex]

  const handleNext = useCallback(() => {
    if (currentIndex < validPanels.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setCurrentIndex(0)
    }
  }, [currentIndex, validPanels.length])

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    } else {
      setCurrentIndex(validPanels.length - 1)
    }
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      void videoRef.current.play()
    }
    setIsPlaying((p) => !p)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
    setIsMuted((m) => !m)
  }

  const handleVideoEnded = () => {
    handleNext()
  }

  const scheduleControlsHide = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500)
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      if (isPlaying) {
        void videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }, [currentIndex, isPlaying])

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  if (validPanels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
        <Film className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No animated panels yet.</p>
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border-2 bg-black shadow-2xl"
      style={{ borderColor: `${primaryColor}60` }}
      onMouseMove={() => {
        setShowControls(true)
        scheduleControlsHide()
      }}
      onMouseLeave={() => scheduleControlsHide()}
      onFocus={() => {
        // Keyboard users tab into the container — reveal controls and keep
        // them available without requiring a mouse.
        setShowControls(true)
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          scheduleControlsHide()
        }
      }}
    >
      {/* Main video stage */}
      <div className="relative aspect-video w-full bg-black">
        {currentPanel?.videoUrl ? (
          <video
            key={currentPanel.id}
            ref={videoRef}
            src={currentPanel.videoUrl}
            autoPlay={isPlaying}
            loop={false}
            muted={isMuted}
            playsInline
            className="h-full w-full object-contain"
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p className="text-sm">Video unavailable for this panel.</p>
          </div>
        )}

        {/* Overlay controls */}
        {showControls && (
          <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/40 via-transparent to-black/60 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white drop-shadow-md">{gameTitle}</h3>
                <p className="text-xs text-white/80 drop-shadow-md">
                  Panel {currentIndex + 1} of {validPanels.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                {currentPanel?.videoUrl && (
                  <a
                    href={currentPanel.videoUrl}
                    download
                    className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                    aria-label={`Download clip for panel ${currentIndex + 1}`}
                    title="Download this clip"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="gap-1 border-white/20 bg-black/40 text-white hover:bg-black/60"
                aria-label={`Previous panel (${currentIndex} of ${validPanels.length})`}
              >
                ← Prev
              </Button>
              <button
                onClick={togglePlay}
                className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: primaryColor }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                className="gap-1 border-white/20 bg-black/40 text-white hover:bg-black/60"
                aria-label={`Next panel (${currentIndex + 2 > validPanels.length ? 1 : currentIndex + 2} of ${validPanels.length})`}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="border-t border-white/10 bg-black/80 p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validPanels.map((panel, idx) => (
            <button
              key={panel.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                idx === currentIndex
                  ? 'border-white'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              title={`Panel ${idx + 1}`}
              aria-label={`Go to panel ${idx + 1}`}
              aria-current={idx === currentIndex ? 'true' : undefined}
            >
              {panel.imageUrl ? (
                <img src={panel.imageUrl} alt={`Panel ${idx + 1}`} className="h-16 w-24 object-cover" />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center bg-muted text-[10px] text-muted-foreground">
                  Panel {idx + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
