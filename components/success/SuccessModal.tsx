'use client'

import { CheckCircle, Copy, Eye, Library, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShareDropdown } from '@/components/ui/share-dropdown'

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
}: SuccessModalProps) {
  const [_copied, setCopied] = useState(false)
  const [twist, setTwist] = useState('')
  const router = useRouter()

  const gameUrl = gameSlug ? `${window.location.origin}/games/${gameSlug}` : null

  const shareData = gameSlug ? {
    gameTitle: title,
    genre,
    panelCount: 5, // Default for generated games
    title,
    text: `Just ${action === 'mint' ? 'minted' : 'created'} "${title}" on writersarcade!`,
    url: gameUrl || window.location.href,
    twist: twist.trim() || undefined,
    author: authorName,
  } : null

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleViewGame = () => {
    if (gameSlug) {
      router.push(`/games/${gameSlug}`)
      onClose()
    }
  }

  const handleManageOwnership = () => {
    router.push('/my-games')
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-card to-black border border-green-500/50 rounded-xl max-w-md w-full shadow-[0_0_0_1px_rgba(34,197,94,0.35)]">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-green-400">{action === 'mint' ? 'Minted!' : 'Game Ready!'}</h2>
              <p className="text-sm text-muted-foreground">
                {description || (action === 'mint' ? 'Your NFT is on-chain' : 'Play it first. Ownership options are waiting in My Games.')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Add your twist (optional)</label>
            <textarea
              className="w-full bg-muted/50 border border-border rounded p-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-green-500/50 resize-none h-20"
              placeholder='e.g. "turned the villain into my ex-VC"'
              value={twist}
              onChange={(e) => setTwist(e.target.value)}
            />
          </div>

          {gameUrl && (
            <div className="flex items-center gap-2 bg-muted/50 rounded p-2 border border-border">
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

          {action === 'generate' && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="font-semibold text-foreground">Next best step: play</div>
              <p className="mt-1 text-muted-foreground">
                Try the story before minting or registering IP. When you are ready to preserve ownership, use My Games.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-background/40 px-2.5 py-1">Mint NFT</span>
                <span className="rounded-full border border-border bg-background/40 px-2.5 py-1">Register IP</span>
                <span className="rounded-full border border-border bg-background/40 px-2.5 py-1">Unlock extras</span>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {gameSlug && (
              <Button
                onClick={handleViewGame}
                className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 text-base"
                size="lg"
              >
                <Eye className="w-4 h-4" />
                Play Now
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {action === 'generate' && (
                <Button
                  variant="outline"
                  onClick={handleManageOwnership}
                  className="text-muted-foreground border-border hover:bg-muted flex items-center justify-center gap-2"
                >
                  <Library className="w-4 h-4" />
                  My Games
                </Button>
              )}

              {shareData ? (
                <ShareDropdown
                  data={shareData}
                  variant="default"
                  className="hover:shadow-[0_0_0_1px_rgba(34,197,94,0.35)]"
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
            </div>

            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-muted-foreground hover:bg-muted"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
