'use client'

import { CheckCircle, Eye, Copy } from 'lucide-react'
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
  _description,
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
      <div className="bg-gradient-to-br from-gray-900 to-black border border-green-500/50 rounded-xl max-w-md w-full shadow-[0_0_0_1px_rgba(34,197,94,0.35)]">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-green-400">{action === 'mint' ? 'Minted!' : 'Game Ready!'}</h2>
              <p className="text-sm text-gray-400">{action === 'mint' ? 'Your NFT is on-chain' : 'Play now or mint as NFT'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-medium">Add your twist (optional)</label>
            <textarea
              className="w-full bg-gray-800/50 border border-gray-700 rounded p-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-green-500/50 resize-none h-20"
              placeholder='e.g. "turned the villain into my ex-VC"'
              value={twist}
              onChange={(e) => setTwist(e.target.value)}
            />
          </div>

          {gameUrl && (
            <div className="flex items-center gap-2 bg-gray-800/50 rounded p-2 border border-gray-700">
              <code className="text-xs text-gray-300 flex-1 truncate">{gameUrl}</code>
              <button
                onClick={() => handleCopy(gameUrl)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
            >
              Close
            </Button>

            {gameSlug && (
              <>
                <Button
                  onClick={handleViewGame}
                  className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Play
                </Button>

                {shareData && (
                  <ShareDropdown
                    data={shareData}
                    variant="default"
                    className="flex-1 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.35)]"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
