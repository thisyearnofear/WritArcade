'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Loader2, Wallet, Gamepad2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { DailyChallengeSubnav } from '@/components/daily-challenge/daily-challenge-subnav'
import { BasePaintTrack } from '@/components/basepaint/basepaint-track'
import { getBasePaintCanvasProxyUrl, getBasePaintDayUrl } from '@/lib/basepaint'

interface CollectionCanvas {
  day: number
  balance: number
  games: Array<{ slug: string; title: string; imageUrl: string | null; playCount: number }>
}

export function BasePaintCollectionView() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [canvases, setCanvases] = useState<CollectionCanvas[]>([])
  const [totalOwned, setTotalOwned] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadCollection = useCallback(async (wallet: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/basepaint/collection?address=${wallet}`)
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      setCanvases(data.canvases ?? [])
      setTotalOwned(data.totalOwned ?? 0)
    } catch {
      setCanvases([])
      setTotalOwned(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      void loadCollection(address)
    } else {
      setCanvases([])
      setTotalOwned(0)
    }
  }, [isConnected, address, loadCollection])

  return (
    <ThemeWrapper theme="arcade">
      <div className="relative flex min-h-screen flex-col">
        <BasePaintTrack />
        <Header />
        <DailyChallengeSubnav />

        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 bg-gradient-to-b from-purple-950/20 via-black to-black px-4 py-10 text-white">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Daily Challenge</p>
            <h1 className="text-3xl font-bold">Your BasePaint collection</h1>
            <p className="text-sm text-muted-foreground">
              Canvases you own on BasePaint — and the writersarcade stories they inspired.
            </p>
          </div>

          {!isConnected ? (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="mx-auto flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-500"
            >
              <Wallet className="h-4 w-4" />
              Connect wallet
            </button>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : totalOwned === 0 ? (
            <div className="rounded-lg border border-white/10 p-8 text-center">
              <p className="text-sm text-muted-foreground">No BasePaint canvases found for this wallet.</p>
              <Link href="/basepaint" className="mt-4 inline-block text-sm text-purple-300 hover:text-purple-200">
                Play today&apos;s Daily Challenge →
              </Link>
            </div>
          ) : (
            <>
              <p className="text-center font-mono text-xs text-muted-foreground">
                {totalOwned} canvas{totalOwned !== 1 ? 'es' : ''} owned
              </p>
              <div className="space-y-4">
                {canvases.map((canvas) => (
                  <article
                    key={canvas.day}
                    className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative aspect-square w-full shrink-0 sm:w-40">
                        <img
                          src={getBasePaintCanvasProxyUrl(canvas.day)}
                          alt={`Day ${canvas.day}`}
                          className="h-full w-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <p className="font-mono text-xs text-purple-300">Day {canvas.day}</p>
                          <p className="text-sm text-muted-foreground">
                            {canvas.games.length > 0
                              ? `${canvas.games.length} community ${canvas.games.length === 1 ? 'story' : 'stories'}`
                              : 'No community stories yet'}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/basepaint/day/${canvas.day}`}
                            className="rounded-md border border-purple-500/40 px-3 py-1.5 text-xs font-semibold text-purple-200"
                          >
                            View archive
                          </Link>
                          <a
                            href={getBasePaintDayUrl(canvas.day)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                          >
                            On BasePaint
                          </a>
                        </div>
                        {canvas.games.length > 0 && (
                          <ul className="mt-3 space-y-1 border-t border-white/10 pt-3">
                            {canvas.games.map((g) => (
                              <li key={g.slug}>
                                <Link
                                  href={`/games/${g.slug}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:underline"
                                >
                                  <Gamepad2 className="h-3 w-3" />
                                  {g.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
