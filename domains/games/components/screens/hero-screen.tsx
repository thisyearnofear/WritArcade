'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, Play, Lightbulb, RefreshCw, Gamepad2 } from 'lucide-react'
import { NarrativePreviewModal } from '@/components/game/narrative-preview-modal'
import type { Game } from '../../types'
import type { ChatEntry } from '../../hooks/use-game-session'

interface HeroScreenProps {
  game: Game
  isStarting: boolean
  loadingProgress: { text: boolean; images: boolean }
  messages: ChatEntry[]
  showPreview: boolean
  showPaymentModal: boolean
  isPaying: boolean
  playFee: string | null
  onStartClick: () => void
  onPreviewApproved: () => void
  onPaymentConfirm: () => void
  onClosePreview: () => void
  onClosePayment: () => void
  startError?: string | null
  onClearStartError?: () => void
  generateStoryboardPreview: () => Array<{
    title: string
    description: string
    imagePrompt: string
    previewImage?: string
  }>
}

export function HeroScreen({
  game,
  isStarting,
  loadingProgress,
  messages,
  showPreview,
  showPaymentModal,
  isPaying,
  playFee,
  onStartClick,
  onPreviewApproved,
  onPaymentConfirm,
  onClosePreview,
  onClosePayment,
  startError,
  onClearStartError,
  generateStoryboardPreview,
}: HeroScreenProps) {
  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
        {/* Background Image */}
        {game.imageUrl && (
          <div className="absolute inset-0">
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover"
            />
            {/* Multiple gradient overlays for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
          </div>
        )}

        {/* Content */}
        <div className="relative w-full h-full flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-4 md:space-y-6 my-auto">
            {/* Genre Badge */}
            <div
              className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-semibold backdrop-blur-sm"
              style={{
                borderColor: game.primaryColor || '#8b5cf6',
                color: game.primaryColor || '#8b5cf6',
                backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
              }}
            >
              {game.genre} • {game.subgenre}
            </div>

            {/* Title with responsive sizing */}
            <h1
              className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight drop-shadow-lg"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              {game.title}
            </h1>

            {/* Tagline with responsive sizing */}
            <blockquote
              className="text-base sm:text-lg md:text-2xl italic opacity-90 drop-shadow-md max-w-xl"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              "{game.tagline}"
            </blockquote>

            {/* Description with responsive sizing */}
            <p className="text-foreground text-sm sm:text-base md:text-lg max-w-xl drop-shadow-md leading-relaxed">
              {game.description}
            </p>

            {startError && !isStarting && (
              <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-black/60 px-4 py-3 text-left backdrop-blur-sm">
                <p className="text-sm font-semibold text-amber-100">Couldn&apos;t start this story</p>
                <p className="mt-1 text-xs text-amber-100/75 leading-relaxed">
                  {startError} Try again, or explore other games in the arcade.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClearStartError?.()
                      onStartClick()
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </button>
                  <Link
                    href="/games"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200"
                  >
                    <Gamepad2 className="h-3.5 w-3.5" />
                    Browse arcade
                  </Link>
                </div>
              </div>
            )}

            {/* CTA Button with responsive sizing */}
            <div className="mt-6 sm:mt-8 pt-4">
              <div className="relative">
                <Button
                  onClick={onStartClick}
                  disabled={isStarting}
                  size="lg"
                  className="w-full text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 rounded-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 relative z-10"
                  style={{
                    backgroundColor: game.primaryColor || '#8b5cf6',
                    color: 'white',
                  }}
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-5 h-5 md:w-6 md:h-6 mr-2 animate-spin" />
                      <span>
                        {!loadingProgress.text ? 'Crafting your story...' :
                          !loadingProgress.images ? 'Generating visuals...' :
                            'Almost ready...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-current" />
                      <span>Start Game</span>
                    </>
                  )}
                </Button>

                {/* Glow effect when starting */}
                {isStarting && (
                  <div
                    className="absolute inset-0 rounded-lg animate-glow pointer-events-none"
                    style={{
                      backgroundColor: 'transparent',
                      boxShadow: `0 0 20px ${game.primaryColor || '#8b5cf6'}60`,
                    }}
                  />
                )}
              </div>

              {/* Loading Progress Indicators */}
              {isStarting && (
                <div className="mt-6 flex items-center justify-center gap-3 animate-slide-up">
                  <div className="space-y-2 w-full max-w-xs">
                    {/* Story generation */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-700 ${loadingProgress.text ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                          }`}
                      />
                      <span className="text-xs text-muted-foreground">Crafting narrative</span>
                      {loadingProgress.text && (
                        <span className="text-xs text-green-400 ml-auto">✓</span>
                      )}
                    </div>

                    {/* Image generation */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-700 ${loadingProgress.images ? 'bg-green-500' : 'bg-muted animate-pulse'
                          }`}
                      />
                      <span className="text-xs text-muted-foreground">Generating visuals</span>
                      {loadingProgress.images && (
                        <span className="text-xs text-green-400 ml-auto">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Tips section with micro-interactions */}
            <motion.div
              className="md:hidden mt-8 pt-4 border-t border-white/20 text-xs text-muted-foreground max-w-xs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
                <p>💡 <span className="text-white font-medium">Pro Tip:</span> Make choices carefully - every decision shapes your story</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Payment Modal Overlay */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-purple-500/30 rounded-xl p-5 sm:p-6 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                  <div className="text-3xl">🪙</div>
                </div>

                <h3 className="text-xl font-bold text-white">Insert Coin to Play</h3>

                <p className="text-muted-foreground">
                  This arcade cabinet requires a credit of <br />
                  <span className="text-xl font-bold text-purple-400">{playFee} $DONUT</span>
                </p>

                <div className="text-xs text-muted-foreground bg-card p-3 rounded border border-border">
                  Funds are automatically split between the Game Creator and the Original Article Author via Story Protocol.
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={onClosePayment}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onPaymentConfirm}
                    disabled={isPaying}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Paying...
                      </>
                    ) : (
                      'Confirm Payment'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Narrative Preview Modal */}
      <NarrativePreviewModal
        isOpen={showPreview}
        game={game}
        firstPanelNarrative={messages.length > 0 ? messages[0]?.content : undefined}
        firstPanelOptions={messages.length > 0 ? (messages[0]?.options || []) : []}
        storyboardPanels={generateStoryboardPreview()}
        onClose={onClosePreview}
        onStart={onPreviewApproved}
        isLoading={isStarting}
      />
    </>
  )
}
