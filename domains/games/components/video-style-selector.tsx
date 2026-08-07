'use client'

import { type VideoStyle, VIDEO_STYLE_LABELS } from '../services/video-generation.types'

export interface VideoStyleSelectorProps {
  value: VideoStyle
  onChange: (style: VideoStyle) => void
  disabled?: boolean
}

const STYLE_DESCRIPTIONS: Record<VideoStyle, string> = {
  cinematic: 'Slow camera drift, dramatic lighting, movie-like feel.',
  loop: 'Seamless ambient motion that loops perfectly.',
  subtle: 'Very gentle parallax — like a living photograph.',
  dynamic: 'Energetic camera movement and environmental motion.',
}

export function VideoStyleSelector({ value, onChange, disabled }: VideoStyleSelectorProps) {
  const styles = Object.entries(VIDEO_STYLE_LABELS) as [VideoStyle, string][]

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Animation style
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {styles.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            disabled={disabled}
            className={`
              relative rounded-lg border p-3 text-left transition-all
              ${
                value === key
                  ? 'border-purple-500 bg-purple-500/10 text-foreground'
                  : 'border-border bg-card/50 text-muted-foreground hover:border-purple-500/40 hover:bg-card'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
              {STYLE_DESCRIPTIONS[key]}
            </span>
            {value === key && (
              <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-purple-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
