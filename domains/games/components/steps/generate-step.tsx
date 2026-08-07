'use client'

import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GameGenre } from '@/components/game/GenreSelector'

interface GenerateStepProps {
  isGenerating: boolean
  hasPreviewedCurrentUrl: boolean
  isPreviewingArticle: boolean
  isStoryMode: boolean
  paymentApproved: boolean
  genre: GameGenre
  url: string
  isDailyFlow?: boolean
}

/**
 * Step 4 — the primary submit / "generate" CTA.
 *
 * The button is `type="submit"` so it triggers the parent <form>'s onSubmit.
 * Label changes across states: source missing → "Preview Article", previewed+unpaid →
 * "Complete Payment to Generate", previewed+paid → "Generate my playable story",
 * wordle → "Create Wordle Game (Free)".
 */
export function GenerateStep({
  isGenerating,
  hasPreviewedCurrentUrl,
  isPreviewingArticle,
  isStoryMode,
  paymentApproved,
  genre,
  url,
  isDailyFlow = false,
}: GenerateStepProps) {
  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Button
        type="submit"
        disabled={isGenerating || isPreviewingArticle}
        className="relative w-full whitespace-normal bg-purple-600 text-white hover:bg-purple-700 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
        size="mobile"
        arcade
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Game...
            <motion.div
              className="absolute inset-0 rounded-lg opacity-0"
              style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0) 70%)',
                filter: 'blur(10px)',
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1],
              }}
              transition={{
                opacity: { duration: 2, repeat: Infinity },
                scale: { duration: 2, repeat: Infinity },
              }}
            />
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            {!hasPreviewedCurrentUrl
              ? isPreviewingArticle
                ? 'Checking Article...'
                : 'Preview Article'
              : isDailyFlow
                ? `Generate Today’s ${genre.charAt(0).toUpperCase() + genre.slice(1)} Story`
              : isStoryMode
              ? paymentApproved
                ? 'Generate my playable story'
                : url.trim()
                  ? 'Complete Payment to Generate'
                  : 'Paste Article to Start'
              : 'Create Wordle Game (Free)'}
          </>
        )}
      </Button>
    </motion.div>
  )
}
