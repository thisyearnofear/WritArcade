'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles } from 'lucide-react'
import { GenreSelector, type GameGenre } from '@/components/game/GenreSelector'
import { DifficultySelector, type GameDifficulty } from '@/components/game/DifficultySelector'
import { PaymentOption } from '@/components/game/PaymentOption'
import { getWriterCoinById } from '@/lib/writerCoins'

interface GameGeneratorFormProps {
  onGameGenerated?: (game: any) => void
}

export function GameGeneratorForm({ onGameGenerated }: GameGeneratorFormProps) {
  const { isConnected } = useAccount()
  const [isGenerating, setIsGenerating] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [url, setUrl] = useState('')
  const [genre, setGenre] = useState<GameGenre>('horror')
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy')
  const [showCustomization, setShowCustomization] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentApproved, setPaymentApproved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const writerCoin = getWriterCoinById('avc') // Default to AVC for web app
  if (!writerCoin) {
    return <div className="text-red-500">Error: Writer coin not configured</div>
  }

  const handlePaymentSuccess = async (transactionHash: string) => {
    setPaymentApproved(true)
    setError(null)
    await generateGame()
  }

  const generateGame = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/games/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptText: promptText.trim() || undefined,
          url: url.trim() || undefined,
          ...(showCustomization && paymentApproved && {
            customization: {
              genre,
              difficulty,
            },
          }),
          ...(paymentApproved && {
            payment: {
              writerCoinId: writerCoin.id,
            },
          }),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate game')
      }

      onGameGenerated?.(result.data)

      // Reset form
      setPromptText('')
      setUrl('')
      setPaymentApproved(false)
      setShowPayment(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      setPaymentApproved(false)
      console.error('Error generating game:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!promptText.trim() && !url.trim()) {
      setError('Please provide either text or a URL')
      return
    }

    // If customization requested, require payment
    if (showCustomization && !isConnected) {
      setError('Please connect your wallet to use customization')
      setShowPayment(true)
      return
    }

    // If customization but not approved payment yet, show payment
    if (showCustomization && !paymentApproved) {
      setShowPayment(true)
      return
    }

    // Otherwise generate normally
    await generateGame()
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <Label htmlFor="url" className="text-sm font-medium">
              Article URL (Newsletter, Blog, etc.)
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.substack.com/p/article-title"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="text-sm text-gray-400 font-medium">OR</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Text Input */}
          <div>
            <Label htmlFor="promptText" className="text-sm font-medium">
              Describe your game idea
            </Label>
            <Textarea
              id="promptText"
              placeholder="Enter any game idea you want to play instantly..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="mt-1 min-h-[120px] resize-none"
            />
          </div>

          {/* Customization Toggle */}
          <div className="pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setShowCustomization(!showCustomization)}
              className="text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center gap-2"
            >
              <span>{showCustomization ? '▼' : '▶'}</span>
              Customize Game (Optional)
            </button>

            {showCustomization && (
              <div className="mt-4 space-y-4 p-4 bg-purple-900/20 rounded-lg border border-purple-700/50">
                <GenreSelector value={genre} onChange={setGenre} disabled={isGenerating} />
                <DifficultySelector value={difficulty} onChange={setDifficulty} disabled={isGenerating} />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-600 rounded-lg">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Payment Section (shown when customization requested) */}
        {showPayment && (
          <div className="space-y-4 p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
            <h3 className="font-semibold text-purple-200">Enable Customization</h3>
            <p className="text-sm text-purple-300">
              Connect your wallet and approve payment to unlock genre/difficulty customization. You can generate games for free without payment.
            </p>
            <PaymentOption
              writerCoin={writerCoin}
              action="generate-game"
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={(err) => setError(err)}
              disabled={isGenerating}
              optional={true}
              onSkip={() => {
                setShowPayment(false)
                setShowCustomization(false)
                generateGame()
              }}
            />
          </div>
        )}

        {!showPayment && (
          <Button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Game...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {paymentApproved ? 'Generate Custom Game' : 'Create Game'}
              </>
            )}
          </Button>
        )}
        </form>

      {/* Tips */}
      <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="font-medium mb-2">💡 Tips for better games:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Paste URLs from Substack, Medium, blogs, or news articles</li>
          <li>• Describe specific themes, genres, or characters you want</li>
          <li>• Try: "A cyberpunk detective story" or "Medieval fantasy adventure"</li>
          <li>• The AI will create unique interpretations of your content</li>
          <li>• Customize genre and difficulty for more control over game generation</li>
        </ul>
      </div>
    </div>
  )
}