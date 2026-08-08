'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Pause, Play } from 'lucide-react'
import { buildStrokeReplayFrames } from '@/lib/basepaint/strokes'

interface StrokeBundle {
  size: number
  palette: string[]
  strokeData: string[]
  totalStrokes: number
}

interface BasePaintStrokeReplayProps {
  day: number
  className?: string
}

export function BasePaintStrokeReplay({ day, className = '' }: BasePaintStrokeReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bundle, setBundle] = useState<StrokeBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [frameIndex, setFrameIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/basepaint/strokes/${day}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load strokes'))))
      .then((data: StrokeBundle) => {
        if (!cancelled) setBundle(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [day])

  const frames = bundle ? buildStrokeReplayFrames(bundle.strokeData) : []

  const renderThroughFrame = useCallback(
    (throughIndex: number) => {
      const canvas = canvasRef.current
      if (!canvas || !bundle) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { size, palette } = bundle
      canvas.width = size
      canvas.height = size
      ctx.clearRect(0, 0, size, size)

      for (let i = 0; i <= throughIndex && i < frames.length; i++) {
        for (const pixel of frames[i].pixels) {
          const color = palette[pixel.colorIndex] ?? '#000000'
          ctx.fillStyle = color.startsWith('#') ? color : `#${color}`
          ctx.fillRect(pixel.x, pixel.y, 1, 1)
        }
      }
    },
    [bundle, frames]
  )

  useEffect(() => {
    renderThroughFrame(frameIndex)
  }, [frameIndex, renderThroughFrame])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    if (frameIndex >= frames.length - 1) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(() => setFrameIndex((f) => f + 1), 40)
    return () => window.clearTimeout(id)
  }, [playing, frameIndex, frames.length])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        Stroke replay unavailable for this day.
      </p>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="overflow-hidden rounded-lg border border-purple-500/20 bg-black">
        <canvas
          ref={canvasRef}
          className="mx-auto w-full max-w-md"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (playing) {
              setPlaying(false)
            } else if (frameIndex >= frames.length - 1) {
              setFrameIndex(0)
              setPlaying(true)
            } else {
              setPlaying(true)
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/40 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/15"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? 'Pause' : frameIndex >= frames.length - 1 ? 'Replay' : 'Play strokes'}
        </button>
        <span className="font-mono text-xs text-muted-foreground">
          {frameIndex + 1} / {bundle.totalStrokes} strokes
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, frames.length - 1)}
        value={frameIndex}
        onChange={(e) => {
          setPlaying(false)
          setFrameIndex(Number(e.target.value))
        }}
        className="w-full accent-purple-500"
        aria-label="Scrub stroke replay"
      />
      <p className="text-[10px] text-muted-foreground">
        Reconstructed from on-chain stroke data via BasePaint GraphQL indexer.
      </p>
    </div>
  )
}
