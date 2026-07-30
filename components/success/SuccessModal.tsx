'use client'

import { CheckCircle, Copy, Eye, Library, RotateCcw, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { trackEvent } from '@/services/analytics'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  _description?: string
  gameSlug?: string
  transactionHash?: string
  _transactionHash?: string
  action: 'mint' | 'generate'
  genre?: string
  authorName?: string
  onReviewSource?: () => void
  onMakeAnother?: () => void
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  description,
  gameSlug,
  _transactionHash,
  action,
  genre = 'Adventure',
  authorName,
  onReviewSource,
  onMakeAnother,
}: SuccessModalProps) {
  const [_copied, setCopied] = useState(false)
  const router = useRouter()

  const gameUrl = gameSlug ? `${window.location.origin}/games/${gameSlug}` : null

  const shareData = gameSlug ? {
    gameTitle: title,
    genre,
    panelCount: 5, // Default for generated games
    title,
    text: `Just ${action === 'mint' ? 'minted' : 'created'} "${title}" on writersarcade!`,
    url: gameUrl || window.location.href,
    author: authorName,
  } : null

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleViewGame = () => {
    if (gameSlug) {
      trackEvent('play_clicked', {
        surface: 'success_modal',
        gameSlug,
      })
      router.push(`/games/${gameSlug}`)
      onClose()
    }
  }

  const handleManageOwnership = () => {
    trackEvent('ownership_clicked', {
      action: 'open_my_games',
      surface: 'success_modal',
      gameSlug,
    })
    router.push('/my-games')
    onClose()
  }

  const handleMakeAnother = () => {
    trackEvent('make_another_clicked', {
      surface: 'success_modal',
      gameSlug,
    })
    onMakeAnother?.()
    onClose()
  }

  // Scroll lock effect
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-3 sm:p-4">
      <div className="bg-gradient-to-br from-card to-black border border-green-500/50 rounded-xl max-w-lg w-full shadow-[0_0_0_1px_rgba(34,197,94,0.35)] max-h-[92vh] overflow-y-auto">
        <div className="p-5 sm:p-6 space-y-5">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 border border-green-500/35">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-300/80">
                {action === 'mint' ? 'Mint complete' : 'Game ready'}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-green-300">
                {action === 'mint' ? 'Minted!' : title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {description || (action === 'mint' ? 'Your NFT is on-chain.' : 'Your game is ready. Play it now, share it, or make another.')}
              </p>
            </div>
          </div>

          {gameUrl && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border">
              <code className="text-xs text-foreground flex-1 truncate">{gameUrl}</code>
              <button
                onClick={() => handleCopy(gameUrl)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-3 pt-1">
            {gameSlug && (
              <Button
                onClick={handleViewGame}
                className="w-full min-h-14 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 text-base font-bold"
                size="lg"
              >
                <Eye className="w-4 h-4" />
                Play Now
              </Button>
            )}

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              {shareData ? (
                <ShareDropdown
                  data={shareData}
                  variant="default"
                  surface="success_modal"
                  className="w-full hover:shadow-[0_0_0_1px_rgba(34,197,94,0.35)]"
                  buttonClassName="w-full"
                />
              ) : (
                <Button
                  variant="outline"
                  className="text-muted-foreground border-border hover:bg-muted flex items-center justify-center gap-2"
                  disabled
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              )}
              {action === 'generate' && (
                <Button
                  variant="outline"
                  onClick={handleMakeAnother}
                  className="border-border hover:bg-muted flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Make Another
                </Button>
              )}
            </div>

            {action === 'generate' && (
              <>
              <div className="rounded-lg bg-purple-900/20 border border-purple-500/30 px-3 py-2 text-center">
                <p className="text-xs text-purple-200/80">
                  Play your story first — when you reach the finale, you can mint it as an NFT on Base.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleManageOwnership}
                  className="inline-flex items-center gap-1.5 text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  <Library className="h-3.5 w-3.5" />
                  My Games
                </button>
                {onReviewSource && (
                  <button
                    type="button"
                    onClick={onReviewSource}
                    className="text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                  >
                    Review source fidelity
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  Close
                </button>
              </div>
              </>
            )}

            {action !== 'generate' && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full text-muted-foreground hover:bg-muted"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
