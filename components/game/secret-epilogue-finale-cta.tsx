'use client'

import { LockKeyhole, ArrowDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSecretPanelStatus } from '@/lib/secret-panel-status'
import type { Game } from '@/domains/games/types'

interface SecretEpilogueFinaleCtaProps {
  game: Game
  nftMinted?: boolean
  className?: string
}

export function SecretEpilogueFinaleCta({
  game,
  nftMinted = false,
  className = '',
}: SecretEpilogueFinaleCtaProps) {
  const secretStatus = getSecretPanelStatus(game)
  if (secretStatus.kind === 'none') return null

  const scrollToMint = () => {
    document.getElementById('finale-mint-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToEpilogue = () => {
    document.getElementById('secret-epilogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const minted = nftMinted || Boolean(game.nftTokenId)

  return (
    <div
      className={`mx-auto w-full max-w-2xl rounded-xl border px-5 py-4 ${className}`}
      style={{
        borderColor: `${game.primaryColor || '#8b5cf6'}50`,
        backgroundColor: `${game.primaryColor || '#8b5cf6'}12`,
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4" style={{ color: game.primaryColor || '#8b5cf6' }} />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Secret epilogue</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {minted
              ? 'Your NFT is ready. Scroll down to decrypt the bonus ending on Base.'
              : 'Mint this game to decrypt the encrypted bonus ending — your story is not fully complete until you do.'}
          </p>
        </div>
        <Button
          type="button"
          onClick={minted ? scrollToEpilogue : scrollToMint}
          className="shrink-0 gap-2 font-semibold text-black"
          style={{ backgroundColor: game.primaryColor || '#8b5cf6' }}
        >
          {minted ? (
            <>
              <Sparkles className="h-4 w-4" />
              Decrypt epilogue
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4" />
              Mint to unlock
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
