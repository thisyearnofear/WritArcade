'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronDown, Lightbulb, Sparkles } from 'lucide-react'
import { GenreSelector, GENRE_LABEL, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, DIFFICULTY_LABEL, type GameDifficulty } from '@/components/game/DifficultySelector'
import { WriterCoinSelector } from '@/components/game/WriterCoinSelector'
import type { WriterCoin } from '@/lib/writer-coins'
import {
  type ImageQuality,
  type ArticlePreview,
  articleGamePremise,
  StylePreview,
} from '@/domains/games/components/game-generator-helpers'
import { PanelStripMockup } from './panel-strip-mockup'

interface CustomizeStepProps {
  isStoryMode: boolean
  hasPreviewedCurrentUrl: boolean
  showAdvancedPayment: boolean
  onToggleAdvancedPayment: () => void
  mode: 'story' | 'wordle'
  writerCoin: WriterCoin
  isMusdPath: boolean
  onSetMusdPath: () => void
  onSetWriterCoinPath: () => void
  showWriterSelector: boolean
  onToggleWriterSelector: () => void
  onWriterCoinSelect: (coin: WriterCoin) => void
  onSetModeWordle: () => void
  showCustomization: boolean
  onToggleCustomization: () => void
  genre: GameGenre
  onGenreChange: (genre: GameGenre) => void
  difficulty: GameDifficulty
  onDifficultyChange: (difficulty: GameDifficulty) => void
  imageQuality: ImageQuality
  onImageQualityChange: (quality: ImageQuality) => void
  onResetDefaults: () => void
  isGenerating: boolean
  articlePreview: ArticlePreview | null
}

/**
 * Step 2 — advanced payment options (MUSD vs Writer Coin + selector),
 * a "Your game" summary card, and the genre/difficulty/image-quality
 * customization panel.
 */
export function CustomizeStep({
  isStoryMode,
  hasPreviewedCurrentUrl,
  showAdvancedPayment,
  onToggleAdvancedPayment,
  mode,
  writerCoin,
  isMusdPath,
  onSetMusdPath,
  onSetWriterCoinPath,
  showWriterSelector,
  onToggleWriterSelector,
  onWriterCoinSelect,
  onSetModeWordle,
  showCustomization,
  onToggleCustomization,
  genre,
  onGenreChange,
  difficulty,
  onDifficultyChange,
  imageQuality,
  onImageQualityChange,
  onResetDefaults,
  isGenerating,
  articlePreview,
}: CustomizeStepProps) {
  return (
    <>
      {isStoryMode && hasPreviewedCurrentUrl && (
        <div className="rounded-xl border border-border bg-card">
          <button
            type="button"
            onClick={onToggleAdvancedPayment}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">Advanced payment options</span>
            </span>
            <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${showAdvancedPayment ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showAdvancedPayment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 border-t border-border p-4">
                  <div className={`rounded-lg border p-3 ${
                    isMusdPath
                      ? 'border-amber-400/50 bg-amber-500/10'
                      : 'border-border bg-muted/30'
                  }`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">MUSD · Mezo</p>
                          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                            Recommended
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Works with any public Paragraph article.
                        </p>
                      </div>
                      {isMusdPath ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selected
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={onSetMusdPath}
                          className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-amber-500"
                        >
                          Use MUSD
                        </button>
                      )}
                    </div>
                  </div>


                  <div className={`rounded-lg border p-3 ${
                    !isMusdPath
                      ? 'border-purple-400/50 bg-purple-500/10'
                      : 'border-purple-500/20 bg-slate-950/30'
                  }`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">Writer coin · Base</p>
                        <p className="text-xs text-muted-foreground">
                          Best when you already know the article belongs to a supported writer.
                        </p>
                        <p className={`mt-1.5 text-[11px] font-semibold ${writerCoin.paymentEnabled ? 'text-emerald-300/90' : 'text-amber-200/90'}`}>
                          {writerCoin.paymentEnabled
                            ? `${writerCoin.writer} auto-receives 60% of every transaction.`
                            : `${writerCoin.symbol} is not enabled on the Base payment contract yet. Use MUSD.`}
                        </p>
                      </div>
                      {!isMusdPath ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selected
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={onSetWriterCoinPath}
                          disabled={!writerCoin.paymentEnabled}
                          className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                            writerCoin.paymentEnabled
                              ? 'border-purple-500/40 bg-purple-500/10 text-purple-100 hover:bg-purple-500/20'
                              : 'cursor-not-allowed border-slate-600/40 bg-slate-800/40 text-slate-400'
                          }`}
                        >
                          {writerCoin.paymentEnabled ? 'Use writer coin' : 'Use MUSD instead'}
                        </button>
                      )}
                    </div>

                    {!isMusdPath && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">Selected writer</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {writerCoin.writer} · {writerCoin.symbol}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={onToggleWriterSelector}
                            className="text-xs text-purple-400 hover:text-purple-300 underline decoration-dotted"
                          >
                            {showWriterSelector ? 'Done' : 'Change writer'}
                          </button>
                        </div>

                        <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 text-xs text-purple-100/80">
                          {writerCoin.paymentEnabled
                            ? 'The article URL must match this writer. If it does not, switch back to MUSD.'
                            : `${writerCoin.symbol} payments are not active on Base yet. MUSD remains available for this writer's articles.`}
                        </div>

                        <AnimatePresence>
                          {showWriterSelector && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <WriterCoinSelector onSelect={onWriterCoinSelect} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {hasPreviewedCurrentUrl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-cyan-500/20 p-2">
              <Sparkles className="h-4 w-4 text-cyan-200" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-200/80">
                Story direction
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                {mode === 'wordle' ? 'Free article Wordle' : '5-panel playable comic'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === 'wordle'
                  ? `A word puzzle derived from the language and themes in "${articlePreview?.title}".`
                  : articleGamePremise(articlePreview!, genre)}
              </p>

              {/* Visual mockup of the 5-panel comic structure */}
              {mode === 'story' && articlePreview && (
                <PanelStripMockup
                  genre={genre}
                  articleTitle={articlePreview.title}
                  primaryColor={undefined}
                />
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                  {mode === 'wordle' ? 'Free' : 'Paid'}
                </span>
                {mode === 'story' && (
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                    {genre} · {difficulty}
                  </span>
                )}
                {mode === 'story' && (
                  <button
                    type="button"
                    onClick={onToggleCustomization}
                    className="rounded-full border border-cyan-500/30 bg-black/20 px-2.5 py-1 text-cyan-100 transition hover:bg-cyan-500/10"
                  >
                    Adjust direction
                  </button>
                )}
                {mode === 'story' && (
                  <button
                    type="button"
                    onClick={onSetModeWordle}
                    className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground transition hover:text-foreground"
                  >
                    Make free Wordle instead
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!isGenerating && isStoryMode && hasPreviewedCurrentUrl && showCustomization && (
        <motion.div
          className="pt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <AnimatePresence>
            <motion.div
              className="mt-4 space-y-4 p-5 rounded-xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-900/80 to-indigo-950/60 shadow-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <motion.div
                className="space-y-4"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-purple-100">Story direction</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-indigo-300 hover:text-indigo-200 underline decoration-dotted disabled:opacity-50"
                    onClick={onResetDefaults}
                    disabled={isGenerating}
                  >
                    Reset to defaults
                  </button>
                </div>

                <StylePreview genre={genre} difficulty={difficulty} />

                <div className="flex justify-center gap-2 text-xs">
                  <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                    Tone: {GENRE_LABEL[genre]}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-purple-800/80 border border-purple-500/80 px-3 py-1 text-purple-100 font-medium">
                    Intensity: {DIFFICULTY_LABEL[difficulty]}
                  </span>
                </div>

                <div>
                  <GenreSelector value={genre} onChange={onGenreChange} disabled={isGenerating} />
                </div>

                <div>
                  <DifficultySelector value={difficulty} onChange={onDifficultyChange} disabled={isGenerating} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-100">
                    Visual finish
                  </label>
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onImageQualityChange('fast')}
                      disabled={isGenerating}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        imageQuality === 'fast'
                          ? 'bg-purple-600 text-white border-2 border-purple-400'
                          : 'bg-purple-900/30 text-purple-300 border-2 border-purple-700/50 hover:border-purple-500'
                      }`}                      >
                      Explore quickly
                    </button>
                    <button
                      type="button"
                      onClick={() => onImageQualityChange('quality')}
                      disabled={isGenerating}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        imageQuality === 'quality'
                          ? 'bg-purple-600 text-white border-2 border-purple-400'
                          : 'bg-purple-900/30 text-purple-300 border-2 border-purple-700/50 hover:border-purple-500'
                      }`}                      >
                      Refined visuals
                    </button>
                  </div>
                  <p className="text-xs text-purple-300/70">
                    {imageQuality === 'fast'
                      ? 'Faster generation for exploring the story direction'
                      : 'More visual detail, with a longer generation time'
                    }
                  </p>
                </div>

                <motion.div
                  className="p-3 rounded-lg bg-purple-900/50 border border-purple-500/30 text-sm text-purple-100 flex items-start gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-300" />
                  <div className="space-y-1 text-xs">
                    <div>• <strong>Tone</strong> shapes narrative mood and visual style</div>
                    <div>• <strong>Story intensity</strong> controls branching complexity</div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </>
  )
}

