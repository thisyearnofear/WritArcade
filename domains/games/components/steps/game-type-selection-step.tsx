'use client'

import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Info } from 'lucide-react'


interface GameTypeSelectionStepProps {
  mode: 'story' | 'wordle'
  onModeChange: (mode: 'story' | 'wordle') => void
  url: string
  onUrlChange: (url: string) => void
  writerCoinUrl: string
}

export function GameTypeSelectionStep({
  mode,
  onModeChange,
  url,
  onUrlChange,
  writerCoinUrl,
}: GameTypeSelectionStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Game Type</Label>
          <motion.div
            className="relative group"
            whileHover={{ scale: 1.1 }}
          >
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-muted border border-border rounded-lg text-xs text-foreground z-50 pointer-events-none"
              initial={{ opacity: 0, y: 5 }}
              whileHover={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              Choose between Story (narrative adventure) or Wordle (word puzzle) game types
            </motion.div>
          </motion.div>
        </div>
        <div className="game-type-selector">
          <motion.button
            type="button"
            onClick={() => onModeChange('story')}
            className={`game-type-option ${mode === 'story' ? 'active' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <span className="font-semibold">Story (5-panel)</span>
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onModeChange('wordle')}
            className={`game-type-option ${mode === 'wordle' ? 'active' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <span className="font-semibold">Wordle (beta)</span>
          </motion.button>
        </div>
        <p className="text-xs text-muted-foreground">
          Story creates a 5-panel narrative game. Wordle creates a free article-derived word puzzle.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor="url" className="text-sm font-medium">
            Paragraph.xyz Article URL
          </Label>
          <motion.div
            className="relative group"
            whileHover={{ scale: 1.1 }}
          >
            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-muted border border-border rounded-lg text-xs text-foreground z-50 pointer-events-none"
              initial={{ opacity: 0, y: 5 }}
              whileHover={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              Only Paragraph.xyz articles from supported authors are accepted. Check FAQ for full list.
            </motion.div>
          </motion.div>
        </div>
        <Input
          id="url"
          type="url"
          placeholder={`${writerCoinUrl}article-title`}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="mt-1 font-mono focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        />
        <p className="text-xs text-muted-foreground mt-1 px-1">Tap to enter the full Paragraph.xyz URL</p>
      </div>
    </div>
  )
}