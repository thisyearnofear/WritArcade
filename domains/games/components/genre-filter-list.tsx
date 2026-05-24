/**
 * GenreFilterList — single source of truth for genre filter UI.
 *
 * Used in two contexts:
 *  - `variant="sidebar"` — full-width vertical list (desktop sidebar)
 *  - `variant="drawer"`  — 2-column grid with larger touch targets (mobile sheet)
 *
 * DRY: previously duplicated inside app/games/page.tsx.
 */

import { ElementType } from 'react'

export interface GenreOption {
  id: string
  label: string
  icon: ElementType
}

interface GenreFilterListProps {
  genres: GenreOption[]
  selected: string | undefined
  onSelect: (genreId: string | undefined) => void
  variant?: 'sidebar' | 'drawer'
}

export function GenreFilterList({
  genres,
  selected,
  onSelect,
  variant = 'sidebar',
}: GenreFilterListProps) {
  const isActive = (id: string) =>
    id === 'all' ? !selected : selected === id

  if (variant === 'drawer') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {genres.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id === 'all' ? undefined : id)}
            className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
              isActive(id)
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-muted-foreground bg-card border border-border hover:border-border'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    )
  }

  // Default: sidebar variant
  return (
    <div className="space-y-1">
      {genres.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id === 'all' ? undefined : id)}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            isActive(id)
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
