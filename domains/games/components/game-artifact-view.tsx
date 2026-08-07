'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Gamepad2,
  GalleryHorizontalEnd,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const PlayTrendChart = dynamic(
  () => import('@/components/ui/play-trend-chart').then(m => m.PlayTrendChart),
  { ssr: false }
)

import type { Game } from '../types'
import { getWriterCoinById, MUSD_CONFIG } from '@/lib/writerCoins'

interface GameArtifactViewProps {
  game: Game
}

function shortAddress(value?: string | null) {
  if (!value) return 'Unknown'
  if (!value.startsWith('0x') || value.length < 12) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function formatDate(value?: Date) {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(value))
}

function hostnameLabel(url?: string | null) {
  if (!url) return '—'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getTokenLabel(game: Game) {
  if (!game.writerCoinId) return 'Writer coin'
  if (game.writerCoinId === 'musd-testnet') return MUSD_CONFIG.testnet.symbol
  if (game.writerCoinId === 'musd-mainnet') return MUSD_CONFIG.mainnet.symbol
  return getWriterCoinById(game.writerCoinId)?.symbol || game.writerCoinId.toUpperCase()
}

function getRemixHref(game: Game) {
  const params = new URLSearchParams()
  if (game.articleUrl) params.set('url', game.articleUrl)
  if (game.mode === 'wordle') params.set('mode', 'wordle')
  if (game.writerCoinId?.startsWith('musd')) params.set('pay', 'musd')
  if (game.writerCoinId && !game.writerCoinId.startsWith('musd')) params.set('pay', 'writercoin')
  return `/generate${params.toString() ? `?${params.toString()}` : ''}`
}

function DetailRow({ label, value, href, title }: { label: string; value: string; href?: string | null; title?: string }) {
  const content = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-sm text-white hover:text-emerald-200"
      title={title || value}>
      <span className="truncate">{value}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  ) : (
    <span className="text-sm text-white truncate" title={title || value}>{value}</span>
  )
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/8 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</span>
      {content}
    </div>
  )
}

export function GameArtifactView({ game }: GameArtifactViewProps) {
  const { address } = useAccount()
  const ownerAddress = game.ownerWallet || game.creatorWallet
  const isOwner = Boolean(address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase())
  const tokenLabel = getTokenLabel(game)
  const hasMintRecord = Boolean(game.nftTokenId || game.nftTransactionHash || game.nftMintedAt)
  const hasSuperRareRecord = Boolean(game.superrareTokenId || game.superrareMintedAt)
  const savedPanels = game.savedPanels || []
  const hasSavedPanels = savedPanels.length > 0
  const remixHref = useMemo(() => getRemixHref(game), [game])

  const [superrareMinting, setSuperrareMinting] = useState(false)
  const [superrareError, setSuperrareError] = useState<string | null>(null)

  const handleSuperrareMint = async () => {
    if (!address) return
    setSuperrareMinting(true)
    setSuperrareError(null)
    try {
      const res = await fetch('/api/superrare/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, wallet: address }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
    } catch (err) {
      setSuperrareError(err instanceof Error ? err.message : 'Minting failed')
    } finally {
      setSuperrareMinting(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        {game.imageUrl ? (
          <img src={game.imageUrl} alt={game.title}
            className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-zinc-950" />
        )}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.2),#000_92%)]" />

        <div className="relative mx-auto flex max-w-6xl flex-col px-4 py-5">
          <div className="flex items-center justify-between">
            <Link href="/games"
              className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Arcade
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-black/35 px-2.5 py-1 text-xs text-white/70 backdrop-blur">
              <BookOpen className="h-3.5 w-3.5" /> Saved creation
            </span>
          </div>

          <div className="grid gap-6 pt-8 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/75">
                  {game.genre}
                </span>
                <span className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/75">
                  ${tokenLabel}
                </span>
                {hasMintRecord ? (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-400/35 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    <BadgeCheck className="h-3 w-3" /> Minted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/65">
                    <Lock className="h-3 w-3" /> Not minted
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl">
                {game.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-white/70 line-clamp-2">{game.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {isOwner && !hasMintRecord ? (
                  <Link href={`/games/${game.slug}?play=1`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">
                    <Sparkles className="h-4 w-4" /> Play & mint as NFT
                  </Link>
                ) : (
                  <Link href={`/games/${game.slug}?play=1`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black hover:bg-emerald-100 transition-colors">
                    <Gamepad2 className="h-4 w-4" /> Play game
                  </Link>
                )}
                {hasSavedPanels ? (
                  <a href="#panels"
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/18 bg-white/8 px-4 text-sm font-semibold text-white hover:border-white/35 transition-colors">
                    <BookOpen className="h-4 w-4" /> View panels
                  </a>
                ) : null}
                <Link href={remixHref}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/18 bg-white/8 px-4 text-sm font-semibold text-white hover:border-white/35 transition-colors">
                  <RefreshCw className="h-4 w-4" /> Remix
                </Link>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="rounded-lg border border-white/10 bg-black/50 p-4 backdrop-blur text-sm">
              <DetailRow label="Creator" value={shortAddress(ownerAddress)} />
              <DetailRow label="Writer" value={game.authorParagraphUsername || game.publicationName || tokenLabel} />
              <DetailRow label="Source" value={hostnameLabel(game.articleUrl)} href={game.articleUrl} title={game.articleUrl || undefined} />
              <details className="group">
                <summary className="flex cursor-pointer select-none list-none items-center justify-between py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45 transition-colors hover:text-white/70 [&::-webkit-details-marker]:hidden">
                  Details
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-1">
                  <DetailRow label="Created" value={formatDate(game.createdAt)} />
                  <DetailRow label="Mode" value={game.mode === 'wordle' ? 'Word puzzle' : '5-panel comic'} />
                </div>
              </details>
            </aside>
          </div>
        </div>
      </section>

      {/* Panels + Play Trend + Details in a 2-col grid */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Panels */}
          <div id="panels">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">Panels</h2>
              <span className="text-xs text-white/50">
                {hasSavedPanels ? `${savedPanels.length} saved` : 'No panels saved'}
              </span>
            </div>
            {hasSavedPanels ? (
              <div className="grid gap-3 md:grid-cols-2">
                {savedPanels.map(panel => (
                  <div key={panel.id} className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                    {panel.imageUrl && (
                      <div className="mb-2 aspect-video overflow-hidden rounded border border-white/10 bg-black">
                        <img src={panel.imageUrl} alt={`Panel ${panel.panelNumber}`}
                          className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                        Panel {panel.panelNumber}
                      </span>
                      <span className="text-[11px] text-white/40">{panel.imageModel || formatDate(panel.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-5 text-white/75 line-clamp-3">{panel.narrativeText}</p>
                    {panel.userChoice && (
                      <div className="mt-2 rounded border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Choice</span>
                        <p className="mt-0.5 text-xs text-white/60">{panel.userChoice}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-zinc-950 p-4">
                <p className="text-sm text-white/55">
                  This game was created but no panels were saved to the artifact. Playing it will generate a fresh session.
                </p>
              </div>
            )}
          </div>

          {/* Play Trend */}
          <PlayTrendChart slug={game.slug} />
        </div>

        {/* Right column — details sidebar */}
        <div className="space-y-4">
          {/* Attribution */}
          <div className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
              <User className="h-3.5 w-3.5" /> Attribution
            </h3>
            <DetailRow label="Owner" value={shortAddress(ownerAddress)} />
            <DetailRow label="Author" value={game.authorParagraphUsername || shortAddress(game.authorWallet)} />
            <DetailRow label="Publication" value={game.publicationName || '—'} />
            <DetailRow label="Token" value={`$${tokenLabel}`} />
          </div>

          {/* Base NFT */}
          <div className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
              <Wallet className="h-3.5 w-3.5" /> NFT
            </h3>
            <DetailRow label="Status"
              value={hasMintRecord ? (game.nftTokenId ? 'Minted' : 'Pending') : 'Not minted'} />
            {hasMintRecord && (
              <>
                <DetailRow label="Token ID" value={game.nftTokenId || '—'} />
                <DetailRow label="Chain" value="Base" />
                <DetailRow label="Contract" value={shortAddress(game.nftContractAddress)}
                  href={game.nftContractAddress ? `https://basescan.org/address/${game.nftContractAddress}` : null} />
                <DetailRow label="Tx" value={shortAddress(game.nftTransactionHash)}
                  href={game.nftTransactionHash ? `https://basescan.org/tx/${game.nftTransactionHash}` : null} />
              </>
            )}
          </div>

          {/* SuperRare */}
          <div className="rounded-lg border border-white/10 bg-zinc-950 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pink-400 mb-2">
              <GalleryHorizontalEnd className="h-3.5 w-3.5" /> SuperRare
            </h3>
            {hasSuperRareRecord ? (
              <DetailRow label="Status" value="Minted" />
            ) : isOwner ? (
              <>
                <p className="text-sm text-white/60 mb-3">Mint as a collectible on SuperRare.</p>
                <button onClick={handleSuperrareMint} disabled={superrareMinting}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50 transition-colors">
                  {superrareMinting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
                  ) : (
                    <><GalleryHorizontalEnd className="h-4 w-4" /> Mint on SuperRare</>
                  )}
                </button>
                {superrareError && <p className="mt-1.5 text-xs text-red-400">{superrareError}</p>}
              </>
            ) : (
              <p className="text-sm text-white/55">Only the owner can mint this.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
