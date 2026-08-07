'use client'

import { motion } from 'framer-motion'
import type { GameGenre } from '@/components/game/GenreSelector'

interface PanelStripMockupProps {
  genre: GameGenre
  articleTitle: string
  primaryColor?: string
}

/**
 * A visual mockup of the 5-panel comic structure shown before payment.
 * Each panel is a styled placeholder with a narrative beat label, giving
 * the user a concrete sense of what they're buying before the wallet wall.
 *
 * Not a real preview — the actual panels are AI-generated after payment.
 * This is a structural preview that reduces purchase anxiety.
 */
const PANEL_LABELS = [
  'Opening',
  'Rising Action',
  'Your Choice',
  'Climax',
  'Resolution',
]

const GENRE_GRADIENTS: Record<string, string> = {
  horror: 'from-red-950 to-purple-950',
  comedy: 'from-amber-900 to-yellow-950',
  mystery: 'from-indigo-950 to-slate-950',
}

export function PanelStripMockup({ genre, articleTitle, primaryColor }: PanelStripMockupProps) {
  const gradient = GENRE_GRADIENTS[genre] || 'from-slate-900 to-slate-950'
  const accentColor = primaryColor || '#8b5cf6'

  return (
    <div className="mt-3">
      {/* 5-panel strip */}
      <div className="grid grid-cols-5 gap-1.5">
        {PANEL_LABELS.map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
            className={`relative aspect-[3/4] rounded-md overflow-hidden bg-gradient-to-br ${gradient} border border-white/10`}
          >
            {/* Panel number badge */}
            <div className="absolute top-1 left-1 rounded bg-black/50 px-1 py-0.5 text-[8px] font-bold text-white/70">
              {i + 1}
            </div>
            {/* Genre icon placeholder */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ opacity: 0.15 }}
            >
              <div
                className="h-6 w-6 rounded-full"
                style={{ background: accentColor }}
              />
            </div>
            {/* Panel label */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
              <p className="text-[8px] font-medium text-white/80 text-center truncate">
                {label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* "What you'll get" description */}
      <p className="mt-2 text-xs text-muted-foreground">
        AI generates 5 custom panels with artwork, branching choices, and mood tracking from
        <span className="text-foreground font-medium"> &ldquo;{articleTitle.slice(0, 40)}{articleTitle.length > 40 ? '…' : ''}&rdquo;</span>
      </p>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Your choices shape the resolution. This previews the story shape, not the ending.
      </p>
    </div>
  )
}
