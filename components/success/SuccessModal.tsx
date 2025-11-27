'use client'

import { CheckCircle, Share2, Eye, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  gameSlug?: string
  transactionHash?: string
  action: 'mint' | 'generate'
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  description,
  gameSlug,
  transactionHash,
  action,
}: SuccessModalProps) {
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const gameUrl = gameSlug ? `${window.location.origin}/games/${gameSlug}` : null

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-green-500/30 rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-green-400">{action === 'mint' ? 'Minted!' : 'Game Ready!'}</h2>
              <p className="text-sm text-gray-400">{action === 'mint' ? 'Your NFT is on-chain' : 'Play now or mint as NFT'}</p>
            </div>
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

          <div className="flex gap-2">
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

                <Button
                  onClick={() => handleCopy(gameUrl!)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  {copied ? '✓' : 'Share'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
