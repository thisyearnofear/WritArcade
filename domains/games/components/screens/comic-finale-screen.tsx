'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useWalletClient } from 'wagmi'
import { Loader2, ArrowRightLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComicBookFinale, type ComicBookFinalePanelData } from '../comic-book-finale'
import { Game, ChatMessage } from '../../types'
import { STORY_CHAIN_ID, isOnStoryNetwork } from '@/lib/story-sdk-client'
import { getWriterCoinById, getWriterCoinByAuthor, MUSD_CONFIG, type PaymentToken } from '@/lib/writerCoins'
import { WriterCoinStrategy } from '@/domains/payments/strategies/writer-coin.strategy'
import { MUSDStrategy } from '@/domains/payments/strategies/musd.strategy'

interface ComicFinaleScreenProps {
  game: Game
  messages: ChatMessage[]
  userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
  showComicFinale: boolean
  setShowComicFinale: (show: boolean) => void
  isMinting: boolean
  handleMintComic: (panelData: ComicBookFinalePanelData[], metadata?: any) => Promise<void>
  onStoryRegistrationComplete?: (result: { ipId: string; txHash: string }) => void
  handlePanelTextChange: (panelIndex: number, newText: string) => void
  handlePanelImageChange?: (panelIndex: number, customPrompt?: string) => void
  regeneratingMessageId?: string | null
  extractedAssetIds: string[]
  derivativeRegistered: boolean
  chainId: number
  switchChain: (config: { chainId: number }) => void
  isSwitchingChain: boolean
  handleRegisterDerivativeIp: () => Promise<void>
  isRegisteringDerivative: boolean
  maxPanels: number
  epilogueReflection?: string | null
}

export function ComicFinaleScreen({
  game,
  messages,
  userChoices,
  setShowComicFinale,
  isMinting,
  handleMintComic,
  onStoryRegistrationComplete,
  handlePanelTextChange,
  handlePanelImageChange,
  regeneratingMessageId,
  extractedAssetIds,
  derivativeRegistered,
  chainId,
  switchChain,
  isSwitchingChain,
  handleRegisterDerivativeIp,
  isRegisteringDerivative,
  maxPanels,
  epilogueReflection,
}: ComicFinaleScreenProps) {
  const router = useRouter()
  const { address: userAddress } = useAccount()
  const { data: walletClient } = useWalletClient()
  const onStoryNetwork = isOnStoryNetwork(chainId)
  const [derivativePromptDismissed, setDerivativePromptDismissed] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [fundError, setFundError] = useState<string | null>(null)

  // Determine if this game can be funded (unfunded but writer coin resolvable)
  const isUnfunded = !game.writerCoinId && !game.paymentId
  const resolvableCoin = game.authorParagraphUsername
    ? getWriterCoinByAuthor(game.authorParagraphUsername)
    : undefined
  // Fall back to MUSD testnet if no writer coin found
  const fundingToken: PaymentToken = resolvableCoin
    ? { type: 'writercoin' as const, coin: resolvableCoin }
    : { type: 'musd' as const, network: 'testnet' as const }

  const handleFundGame = useCallback(async () => {
    if (!walletClient || !userAddress || !fundingToken) return

    setIsFunding(true)
    setFundError(null)

    try {
      const strategy = fundingToken.type === 'musd' ? new MUSDStrategy() : new WriterCoinStrategy()
      const config = fundingToken.type === 'musd' ? MUSD_CONFIG.testnet : fundingToken.coin
      const amount = config.gameGenerationCost.toString()

      const txHash = await strategy.executePayment({
        walletClient,
        userAddress,
        token: fundingToken,
        action: 'generate-game',
        amount,
      })

      // Link payment to this game
      const fundRes = await fetch(`/api/games/${game.slug}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionHash: txHash }),
      })

      if (!fundRes.ok) {
        const err = await fundRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to link payment to game')
      }

      // Refresh the page to pick up the new writerCoinId
      router.refresh()
    } catch (err) {
      console.error('[FundGame] Error:', err)
      setFundError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsFunding(false)
    }
  }, [walletClient, userAddress, fundingToken, game.slug, router])

  const mintToken = game.writerCoinId?.startsWith('musd')
    ? game.writerCoinId === 'musd-mainnet'
      ? MUSD_CONFIG.mainnet
      : MUSD_CONFIG.testnet
    : game.writerCoinId
      ? getWriterCoinById(game.writerCoinId)
      : undefined
  const mintCost = mintToken
    ? Number(mintToken.mintCost) / 10 ** mintToken.decimals
    : null
  const mintCostLabel = mintCost === null
    ? undefined
    : `${mintCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${mintToken?.symbol}`

  const buildComicPanels = (): ComicBookFinalePanelData[] => {
    const assistantMessages = messages.filter(m => m.role === 'assistant')

    return assistantMessages.map((message) => {
      const messageIndex = messages.indexOf(message)
      const nextUserMessage = messages
        .slice(messageIndex + 1)
        .find(m => m.role === 'user')

      return {
        id: message.id,
        narrativeText: message.content,
        imageUrl: (message as any).narrativeImage || null,
        imageModel: (message as any).imageModel || 'unknown',
        userChoice: nextUserMessage?.content || undefined,
      }
    })
  }

  return (
    <div>
      <ComicBookFinale
        gameId={game.id}
        gameSlug={game.slug}
        gameTitle={game.title}
        genre={game.genre}
        primaryColor={game.primaryColor || '#8b5cf6'}
        panels={buildComicPanels()}
        onBack={() => setShowComicFinale(false)}
        onMint={handleMintComic}
        onStoryRegistrationComplete={onStoryRegistrationComplete}
        isMinting={isMinting}
        nftMinted={Boolean(game.nftTransactionHash || game.nftTokenId)}
        storyIpId={game.storyIpId}
        creatorWallet={game.creatorWallet || ''}
        articleUrl={game.articleUrl || ''}
        articleTitle={game.articleContext?.replace(/^Article:\s*"([^"]+)".*$/s, '$1') || game.title}
        authorParagraphUsername={game.authorParagraphUsername || 'Unknown Author'}
        authorWallet={game.authorWallet}
        difficulty={game.difficulty || 'medium'}
        userChoices={userChoices}
        onPanelTextChange={handlePanelTextChange}
        onPanelImageChange={handlePanelImageChange}
        regeneratingMessageId={regeneratingMessageId}
        epilogueReflection={epilogueReflection || undefined}
        mintAvailable={Boolean(game.writerCoinId)}
        mintUnavailableReason={isUnfunded && !fundingToken ? 'No payment token available for this game.' : undefined}
        onFundGame={isUnfunded && fundingToken && userAddress ? handleFundGame : undefined}
        isFunding={isFunding}
        mintTokenLabel={mintToken?.symbol}
        mintCostLabel={mintCostLabel}
      />
      {extractedAssetIds.length > 0 && !derivativeRegistered && !derivativePromptDismissed && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl px-6 py-4 flex flex-col items-center gap-3 shadow-2xl max-w-sm w-full mx-4">
          <button
            type="button"
            onClick={() => setDerivativePromptDismissed(true)}
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss derivative IP prompt"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-semibold text-white">{extractedAssetIds.length} asset{extractedAssetIds.length > 1 ? 's' : ''} extracted</span> — register as derivative IP on Story Protocol to establish royalty chains.
          </p>
          {!game.storyIpId ? (
            <>
              <p className="text-xs text-amber-400 text-center">
                Register this game as IP first, then return here to link derivative assets.
              </p>
              <Button
                onClick={() => {
                  setDerivativePromptDismissed(true)
                  document.getElementById('game-ip-registration')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Open Game IP Registration
              </Button>
            </>
          ) : !onStoryNetwork ? (
            <Button
              onClick={() => switchChain({ chainId: STORY_CHAIN_ID })}
              disabled={isSwitchingChain}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
            >
              {isSwitchingChain ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
              Switch to Story Network
            </Button>
          ) : (
            <Button
              onClick={handleRegisterDerivativeIp}
              disabled={isRegisteringDerivative}
              className="w-full bg-white text-black hover:bg-muted"
            >
              {isRegisteringDerivative ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isRegisteringDerivative ? 'Registering…' : 'Register Derivative IP on Story'}
            </Button>
          )}
        </div>
      )}
      {derivativeRegistered && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-green-700 rounded-xl px-6 py-3 text-green-400 text-sm text-center shadow-2xl">
          ✅ Derivative IP registered on Story Protocol
        </div>
      )}
    </div>
  )
}
