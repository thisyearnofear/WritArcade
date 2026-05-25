'use client'

import { Loader2, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComicBookFinale, type ComicBookFinalePanelData } from '../comic-book-finale'
import { Game, ChatMessage } from '../../types'
import { STORY_CHAIN_ID, isOnStoryNetwork } from '@/lib/story-sdk-client'

interface ComicFinaleScreenProps {
  game: Game
  messages: ChatMessage[]
  userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
  showComicFinale: boolean
  setShowComicFinale: (show: boolean) => void
  isMinting: boolean
  handleMintComic: (panelData: ComicBookFinalePanelData[], metadata?: any) => Promise<void>
  handlePanelTextChange: (panelIndex: number, newText: string) => void
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
  handlePanelTextChange,
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
  const onStoryNetwork = isOnStoryNetwork(chainId)

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
        gameTitle={game.title}
        genre={game.genre}
        primaryColor={game.primaryColor || '#8b5cf6'}
        panels={buildComicPanels()}
        onBack={() => setShowComicFinale(false)}
        onMint={handleMintComic}
        isMinting={isMinting}
        creatorWallet={game.creatorWallet || ''}
        articleUrl={game.articleUrl || ''}
        articleTitle={game.articleContext?.replace(/^Article:\s*"([^"]+)".*$/s, '$1') || game.title}
        authorParagraphUsername={game.authorParagraphUsername || 'Unknown Author'}
        authorWallet={game.authorWallet}
        difficulty={game.difficulty || 'medium'}
        userChoices={userChoices}
        onPanelTextChange={handlePanelTextChange}
        epilogueReflection={epilogueReflection || undefined}
      />
      {extractedAssetIds.length > 0 && !derivativeRegistered && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl px-6 py-4 flex flex-col items-center gap-3 shadow-2xl max-w-sm w-full mx-4">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-semibold text-white">{extractedAssetIds.length} asset{extractedAssetIds.length > 1 ? 's' : ''} extracted</span> — register as derivative IP on Story Protocol to establish royalty chains.
          </p>
          {!game.storyIpId ? (
            <p className="text-xs text-amber-400 text-center">
              Register this game as IP first using the IP Registration button above, then return here to link derivative assets.
            </p>
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
