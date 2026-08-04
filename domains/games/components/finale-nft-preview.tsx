'use client'

import { Button } from '@/components/ui/button'
import { Zap, Loader2, Wallet, AlertTriangle, X } from 'lucide-react'
import { UserAttribution } from '@/components/ui/user-attribution'
import type { ComicBookFinalePanelData } from './comic-book-finale'

interface NftPreviewViewProps {
  panels: ComicBookFinalePanelData[]
  gameTitle: string
  genre: string
  totalPanels: number
  primaryColor: string
  creatorWallet: string
  authorParagraphUsername: string
  authorWallet?: string
  difficulty?: string
  articleUrl: string
  mintAvailable: boolean
  mintUnavailableReason?: string
  mintTokenLabel?: string
  mintCostLabel?: string
  isMinting: boolean
  onMint: () => void
  // Funding fallback
  onFundGame?: () => void
  onConnectWallet?: (() => void) | undefined
  isFunding?: boolean
  fundCostLabel?: string
  fundBalanceLabel?: string
  hasEnoughToFund?: boolean
  fundError?: string | null
  onDismissFundError?: () => void
}

/**
 * NFT preview view — shows how the comic will appear as an NFT and
 * provides the mint CTA (or funding fallback).
 * Extracted from ComicBookFinale to reduce its size.
 */
export function NftPreviewView({
  panels,
  gameTitle,
  genre,
  totalPanels,
  primaryColor,
  creatorWallet,
  authorParagraphUsername,
  authorWallet,
  difficulty = 'medium',
  articleUrl,
  mintAvailable,
  mintUnavailableReason,
  mintTokenLabel,
  mintCostLabel,
  isMinting,
  onMint,
  onFundGame,
  onConnectWallet,
  isFunding,
  fundCostLabel,
  fundBalanceLabel,
  hasEnoughToFund,
  fundError,
  onDismissFundError,
}: NftPreviewViewProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>
          📜 Your NFT Comic Preview
        </h2>
        <p className="text-muted-foreground text-sm">
          This is how your comic will appear as an NFT
        </p>
      </div>

      {/* NFT metadata preview */}
      <div className="max-w-2xl mx-auto rounded-lg border border-border bg-card/60 p-4 text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          On-chain metadata (GameMetadata struct)
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs font-mono">
          <dt className="text-muted-foreground">title</dt>
          <dd className="break-words">{gameTitle}</dd>
          <dt className="text-muted-foreground">genre</dt>
          <dd>{genre}</dd>
          <dt className="text-muted-foreground">difficulty</dt>
          <dd>{difficulty}</dd>
          <dt className="text-muted-foreground">creator</dt>
          <dd className="break-all">{creatorWallet}</dd>
          <dt className="text-muted-foreground">articleUrl</dt>
          <dd className="break-all">{articleUrl}</dd>
        </dl>
      </div>

      <div
        className="rounded-xl p-6 border-4 shadow-2xl max-w-2xl mx-auto"
        style={{
          borderColor: primaryColor,
          backgroundColor: 'rgba(0,0,0,0.6)',
        }}
      >
        {/* Comic title header */}
        <div className="text-center mb-6 pb-4 border-b border-white/20">
          <h3 className="text-2xl font-bold mb-2">{gameTitle}</h3>
          <p className="text-sm text-muted-foreground mb-3">{genre} • {totalPanels} Panels</p>

          {/* Attribution in NFT preview */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="text-muted-foreground">Created by</span>
            <UserAttribution
              type="creator"
              walletAddress={creatorWallet}
              size="sm"
              showLink={false}
            />
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Inspired by</span>
            <UserAttribution
              type="author"
              paragraphUsername={authorParagraphUsername}
              authorWallet={authorWallet}
              size="sm"
              showLink={false}
            />
          </div>
        </div>

        {/* Vertical comic strip layout */}
        <div className="space-y-6">
          {panels.map((panel, idx) => (
            <div
              key={panel.id}
              className="rounded-xl overflow-hidden border-2"
              style={{ borderColor: primaryColor + '40' }}
            >
              <div className="w-full h-48 overflow-hidden bg-black">
                {panel.imageUrl ? (
                  <img
                    src={panel.imageUrl}
                    alt={`Scene ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-black">
                    <span className="text-muted-foreground text-sm">No image</span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-black/60">
                <p className="text-sm leading-relaxed text-foreground text-center">
                  {panel.narrativeText}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* NFT metadata footer */}
        <div className="mt-6 pt-4 border-t border-white/20 text-center">
          <p className="text-xs text-muted-foreground">
            🎨 Generated with writersarcade • Unique Comic NFT
          </p>
        </div>
      </div>

      {/* Mint CTA */}
      <div className="text-center">
        {mintAvailable ? (
          <>
            <Button
              onClick={onMint}
              disabled={isMinting}
              size="lg"
              className="gap-2"
              style={{ backgroundColor: primaryColor, color: 'white' }}
            >
              <Zap className="w-4 h-4" />
              {isMinting ? 'Preparing NFT…' : 'Mint this NFT'}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {`Cost: ${mintCostLabel || 'token mint fee'}${mintTokenLabel ? ` in ${mintTokenLabel}` : ''}. Wallet prompts: approve token spend, then mint on Base.`}
            </p>
          </>
        ) : onFundGame ? (
          <>
            <Button
              onClick={onFundGame}
              disabled={isFunding}
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isFunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {isFunding ? 'Processing payment…' : `Pay ${fundCostLabel || ''} to unlock minting`}
            </Button>
            {fundError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-md px-3 py-1.5">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="flex-1">{fundError}</span>
                {onDismissFundError && (
                  <button onClick={onDismissFundError} className="text-red-300 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {fundBalanceLabel && (
                <span className={`font-medium ${hasEnoughToFund === false ? 'text-red-400' : 'text-emerald-400'}`}>
                  Balance: {fundBalanceLabel}
                  {hasEnoughToFund === false && ' (insufficient)'}
                </span>
              )}
              {fundBalanceLabel && ' · '}
              One payment unlocks minting. Your wallet will prompt you to approve the spend.
            </p>
          </>
        ) : onConnectWallet ? (
          <>
            <Button
              onClick={onConnectWallet}
              size="lg"
              className="gap-2 bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Wallet className="w-4 h-4" />
              Connect wallet to unlock minting
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {fundCostLabel ? `Cost: ${fundCostLabel}. ` : ''}Connect your wallet to pay and enable minting.
            </p>
          </>
        ) : (
          <>
            <Button disabled size="lg" className="gap-2">
              <Zap className="w-4 h-4" />
              Mint this NFT
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {mintUnavailableReason || 'This legacy game is playable, but minting is unavailable.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
