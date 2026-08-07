'use client'

import { radioCardClass } from './radioCard'

export type GameGenre = 'horror' | 'comedy' | 'mystery'

const GENRES = ['horror', 'comedy', 'mystery'] as const

export const GENRE_LABEL: Record<GameGenre, string> = {
  horror: 'Horror',
  comedy: 'Comedy',
  mystery: 'Mystery',
}

const GENRE_COPY: Record<GameGenre, string> = {
  horror: 'Dark, high stakes',
  comedy: 'Light, witty beats',
  mystery: 'Clues and reveals',
}

interface GenreSelectorProps {
  value?: GameGenre
  onChange?: (genre: GameGenre) => void
  disabled?: boolean
}

export function GenreSelector({ value = 'horror', onChange, disabled = false }: GenreSelectorProps) {
  const selected = value

  const handleSelect = (genre: GameGenre) => {
    if (disabled) return
    onChange?.(genre)
  }

  // Genre icons as SVG components
  const GenreIcon = ({ genre }: { genre: GameGenre }) => {
    switch (genre) {
      case 'horror':
        return (
          <svg className="genre-icon w-6 h-6" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            <circle cx="8" cy="12" r="1" fill="currentColor"/>
            <circle cx="16" cy="12" r="1" fill="currentColor"/>
            <path d="M10 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" fill="currentColor"/>
          </svg>
        )
      case 'comedy':
        return (
          <svg className="genre-icon w-6 h-6" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="8" cy="10" r="1" fill="currentColor"/>
            <circle cx="16" cy="10" r="1" fill="currentColor"/>
            <path d="M8 16c0-2 4-2 4 0s-4 2-4 2z" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 16c0-2-4-2-4 0s4 2 4 2z" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      case 'mystery':
        return (
          <svg className="genre-icon w-6 h-6" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 15.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm5-2.5c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5z"/>
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="game-type-selector" role="radiogroup" aria-label="Tone">
      <label className="mb-3 block text-sm font-medium text-purple-200">Tone</label>
      <div className="grid grid-cols-3 gap-3">
        {GENRES.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => handleSelect(genre)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(genre) }
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); const idx = GENRES.indexOf(selected); const next = GENRES[(idx + 1) % GENRES.length]; handleSelect(next) }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const idx = GENRES.indexOf(selected); const prev = GENRES[(idx - 1 + GENRES.length) % GENRES.length]; handleSelect(prev) }
            }}
            role="radio"
            aria-checked={selected === genre}
            tabIndex={selected === genre ? 0 : -1}
            disabled={disabled}
            className={radioCardClass(selected === genre, disabled)}
>
            <GenreIcon genre={genre} />
            <span className="text-sm">{GENRE_LABEL[genre]}</span>
            <span className="text-[11px] text-purple-300/80">{GENRE_COPY[genre]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
