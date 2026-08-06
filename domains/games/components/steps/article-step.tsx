'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, FileText, Info, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WriterCoin } from '@/lib/writerCoins'
import {
  type ArticlePreview,
  articlePreviewMeta,
} from '@/domains/games/components/game-generator-helpers'
import type { DailyGenerateFlow } from '@/lib/stores/game-generator.store'
import { GAME_MODE_EXPLOAINER } from '@/lib/game-mode-labels'

interface ArticleStepProps {
  url: string
  onUrlChange: (value: string) => void
  isMusdPath: boolean
  detectedCoin: WriterCoin | undefined
  isAutoDetected: boolean
  onUseDetectedCoin: () => void
  articlePreview: ArticlePreview | null
  hasPreviewedCurrentUrl: boolean
  isPreviewingArticle: boolean
  onPreview: () => void
  initialMode: 'story' | 'wordle' | undefined
  mode: 'story' | 'wordle'
  onSelectStory: () => void
  onSelectWordle: () => void
  dailyFlow?: DailyGenerateFlow | null
}

/**
 * Step 1 — article URL entry, auto-detected writer-coin banner, preview
 * card, and the Story/Wordle mode toggle (shown only when entering via
 * ?mode=wordle before a preview exists).
 */
export function ArticleStep({
  url,
  onUrlChange,
  isMusdPath,
  detectedCoin,
  isAutoDetected,
  onUseDetectedCoin,
  articlePreview,
  hasPreviewedCurrentUrl,
  isPreviewingArticle,
  onPreview,
  initialMode,
  mode,
  onSelectStory,
  onSelectWordle,
  dailyFlow,
}: ArticleStepProps) {
  if (dailyFlow) {
    return (
      <div className="rounded-xl border border-purple-500/25 bg-purple-950/10 p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s source</h2>
          <p className="text-sm text-muted-foreground">
            BasePaint Day {dailyFlow.day} — {dailyFlow.theme}
          </p>
        </div>
        {dailyFlow.canvasUrl && (
          <div className="overflow-hidden rounded-lg border border-purple-500/20">
            <img
              src={dailyFlow.canvasUrl}
              alt={dailyFlow.theme}
              className="w-full aspect-video object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        )}
        {articlePreview && (
          <div className="rounded-lg border border-border bg-card/80 p-3 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">Story seed</p>
            <p className="text-sm text-muted-foreground line-clamp-4">{articlePreview.excerpt}</p>
          </div>
        )}
        {dailyFlow.palette && dailyFlow.palette.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Palette</span>
            <div className="flex gap-1">
              {dailyFlow.palette.slice(0, 8).map((color) => (
                <div
                  key={color}
                  className="h-4 w-4 rounded-sm border border-white/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-emerald-400/90">
          Source locked in — customize genre below, then generate your daily comic.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Paste the article</h2>
        <p className="text-sm text-muted-foreground">
          Start with a public Paragraph article.
        </p>
        <p className="mt-2 text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 leading-relaxed">
          {GAME_MODE_EXPLOAINER}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor="url" className="text-sm font-medium">
            Paragraph.xyz Article URL
          </Label>
        </div>
        <Input
          id="url"
          type="url"
          placeholder={isMusdPath ? 'https://paragraph.xyz/... (any article)' : 'https://paragraph.xyz/...'}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="mt-1 font-mono focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        />
      </div>

      {/* Auto-detected writer coin recommendation */}
      {isAutoDetected && detectedCoin && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  {detectedCoin.symbol} detected
                </p>
                <span className="rounded-full border border-purple-400/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                  Writer Coin
                </span>
              </div>
              <p className="mt-1 text-xs text-purple-200/70">
                This article is by {detectedCoin.name}. Pay with {detectedCoin.symbol} on Base to support them directly.
              </p>
            </div>
            <button
              type="button"
              onClick={onUseDetectedCoin}
              className="flex-shrink-0 inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition-colors"
            >
              Use {detectedCoin.symbol}
            </button>
          </div>
        </motion.div>
      )}

      {articlePreview && hasPreviewedCurrentUrl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-emerald-500/20 p-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Article ready</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">{articlePreview.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {articlePreviewMeta(articlePreview)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {!articlePreview && (
        <button
          type="button"
          onClick={onPreview}
          disabled={isPreviewingArticle || !url.trim()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPreviewingArticle ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {isPreviewingArticle ? 'Checking article...' : 'Preview article'}
        </button>
      )}

      {/* Mode toggle is only shown when the user explicitly enters via
          ?mode=wordle. The default /generate path is always Story so we
          remove one decision from the happy path. */}
      {!hasPreviewedCurrentUrl && initialMode === 'wordle' && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
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
          <div className="grid grid-cols-1 gap-2 rounded-lg bg-muted/40 border border-border p-1 min-[420px]:grid-cols-2">
            <motion.button
              type="button"
              onClick={onSelectStory}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'story'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <span className="font-semibold">Story</span>
              <span className={`text-[10px] font-bold ${mode === 'story' ? 'text-purple-200' : 'text-purple-400'}`}>
                5-panel · NFT · Inco
              </span>
            </motion.button>
            <motion.button
              type="button"
              onClick={onSelectWordle}
              className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'wordle'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <span className="font-semibold">Wordle</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-sm px-1 py-0.5 ${
                mode === 'wordle'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}>
                Free
              </span>
            </motion.button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === 'story'
              ? 'Story creates a 5-panel narrative game with AI-generated artwork, branching choices, and an encrypted secret epilogue (Inco on Base) unlocked after you mint the NFT.'
              : 'Wordle creates a free word puzzle derived from your article vocabulary. No payment or wallet needed — a quick taste of the engine.'}
          </p>
        </div>
      )}
    </div>
  )
}
