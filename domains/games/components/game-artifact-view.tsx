'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  ExternalLink,
  Gamepad2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react'

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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getChainName(chainId?: number) {
  if (chainId === 8453) return 'Base'
  if (chainId === 31611) return 'Mezo Matsnet'
  if (chainId === 31612) return 'Mezo'
  return chainId ? `Chain ${chainId}` : 'Base'
}

function getTxUrl(hash?: string, chainId?: number) {
  if (!hash) return null
  if (chainId === 31611) return `https://explorer.test.mezo.org/tx/${hash}`
  return `https://basescan.org/tx/${hash}`
}

function getContractUrl(address?: string, chainId?: number) {
  if (!address) return null
  if (chainId === 31611) return `https://explorer.test.mezo.org/address/${address}`
  return `https://basescan.org/address/${address}`
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

function DetailRow({ label, value, href }: { label: string; value: string; href?: string | null }) {
  return (
    <div className="border-b border-white/10 py-3 last:border-b-0">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/45">{label}</div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-white hover:text-emerald-200"
        >
          <span className="truncate">{value}</span>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
      ) : (
        <div className="mt-1 truncate text-sm text-white">{value}</div>
      )}
    </div>
  )
}

export function GameArtifactView({ game }: GameArtifactViewProps) {
  const { address } = useAccount()
  const ownerAddress = game.ownerWallet || game.creatorWallet
  const isOwner = Boolean(address && ownerAddress && address.toLowerCase() === ownerAddress.toLowerCase())
  const tokenLabel = getTokenLabel(game)
  const hasMintRecord = Boolean(game.nftTokenId || game.nftTransactionHash || game.nftMintedAt)
  const savedPanels = game.savedPanels || []
  const hasSavedPanels = savedPanels.length > 0
  const nftTxUrl = getTxUrl(game.nftTransactionHash, game.nftChainId)
  const nftContractUrl = getContractUrl(game.nftContractAddress, game.nftChainId)
  const remixHref = useMemo(() => getRemixHref(game), [game])

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative min-h-[78vh] overflow-hidden border-b border-white/10">
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt={game.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-950" />
        )}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.2),#000_92%)]" />

        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col px-4 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Arcade
            </Link>
            <div className="inline-flex items-center gap-2 rounded border border-white/15 bg-black/35 px-2.5 py-1.5 text-xs text-white/70 backdrop-blur">
              <BookOpen className="h-3.5 w-3.5" />
              Saved creation
            </div>
          </div>

          <div className="grid flex-1 items-end gap-8 py-12 lg:grid-cols-[1fr_360px]">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-white/75">
                  {game.genre}
                </span>
                <span className="rounded border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-white/75">
                  {tokenLabel}
                </span>
                {hasMintRecord ? (
                  <span className="inline-flex items-center gap-1 rounded border border-emerald-400/35 bg-emerald-400/10 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-200">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    NFT minted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-white/65">
                    <Lock className="h-3.5 w-3.5" />
                    Not minted
                  </span>
                )}
              </div>

              <h1 className="font-serif text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl md:text-6xl">
                {game.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                {game.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#panels"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-100"
                >
                  <BookOpen className="h-4 w-4" />
                  {hasSavedPanels ? 'View panels' : 'View saved record'}
                </a>
                <Link
                  href={remixHref}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/18 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/12"
                >
                  <RefreshCw className="h-4 w-4" />
                  Create your version
                </Link>
                {isOwner && !hasMintRecord ? (
                  <Link
                    href={`/games/${game.slug}?play=1`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
                  >
                    <Sparkles className="h-4 w-4" />
                    Complete a mintable session
                  </Link>
                ) : (
                  <Link
                    href={`/games/${game.slug}?play=1`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/14 bg-black/25 px-4 py-2 text-sm font-semibold text-white/74 transition hover:border-white/28 hover:text-white"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    Start a new session
                  </Link>
                )}
              </div>
            </div>

            <aside className="rounded-lg border border-white/12 bg-black/55 p-5 backdrop-blur">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-200" />
                Creation record
              </div>
              <DetailRow label="Creator" value={shortAddress(ownerAddress)} />
              <DetailRow label="Writer" value={game.authorParagraphUsername || game.publicationName || tokenLabel} />
              <DetailRow label="Source" value={game.articleUrl || 'No source URL saved'} href={game.articleUrl} />
              <DetailRow label="Created" value={formatDate(game.createdAt)} />
              <DetailRow label="Mode" value={game.mode === 'wordle' ? 'Word puzzle' : '5-panel comic game'} />
            </aside>
          </div>
        </div>
      </section>

      <section id="panels" className="border-b border-white/10 bg-black px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Saved artifact</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-normal text-white">
                Panels and provenance
              </h2>
            </div>
            <div className="rounded border border-white/12 bg-white/5 px-3 py-2 text-sm text-white/64">
              {hasSavedPanels ? `${savedPanels.length} panel${savedPanels.length === 1 ? '' : 's'} saved` : 'No canonical panels saved'}
            </div>
          </div>

          {hasSavedPanels ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {savedPanels.map(panel => (
                <article
                  key={panel.id}
                  className="rounded-lg border border-white/10 bg-zinc-950 p-5"
                >
                  {panel.imageUrl && (
                    <div className="mb-4 aspect-video overflow-hidden rounded-md border border-white/10 bg-black">
                      <img
                        src={panel.imageUrl}
                        alt={`Panel ${panel.panelNumber}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                      Panel {panel.panelNumber}
                    </div>
                    <div className="text-xs text-white/42">{panel.imageModel || formatDate(panel.createdAt)}</div>
                  </div>
                  <p className="text-sm leading-6 text-white/78">{panel.narrativeText}</p>
                  {panel.userChoice && (
                    <div className="mt-4 rounded border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/38">Creator choice</div>
                      <p className="mt-1 text-sm leading-5 text-white/66">{panel.userChoice}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-white/10 bg-zinc-950 p-5">
              <p className="max-w-3xl text-sm leading-6 text-white/62">
                This creation has saved game metadata and provenance, but it does not yet have a durable completed panel set attached to the public artifact. Starting a new session will create a fresh playthrough instead of reconstructing the original creator's panels.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-white/10 bg-zinc-950 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <User className="h-4 w-4 text-white/70" />
            Attribution
          </div>
          <DetailRow label="Game owner" value={shortAddress(ownerAddress)} />
          <DetailRow label="Article author" value={game.authorParagraphUsername || shortAddress(game.authorWallet)} />
          <DetailRow label="Publication" value={game.publicationName || 'Unknown'} />
          <DetailRow label="Payment token" value={tokenLabel} />
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Wallet className="h-4 w-4 text-white/70" />
            NFT
          </div>
          {hasMintRecord ? (
            <>
              <DetailRow label="Status" value={game.nftTokenId ? 'Minted' : 'Mint transaction recorded'} />
              <DetailRow label="Token ID" value={game.nftTokenId || 'Pending confirmation'} />
              <DetailRow label="Chain" value={getChainName(game.nftChainId)} />
              <DetailRow label="Contract" value={shortAddress(game.nftContractAddress)} href={nftContractUrl} />
              <DetailRow label="Mint transaction" value={shortAddress(game.nftTransactionHash)} href={nftTxUrl} />
              <DetailRow label="NFT metadata" value={game.nftMetadataUri || 'Not saved'} href={game.nftMetadataUri} />
              <DetailRow label="Artifact manifest" value={game.artifactManifestUri || game.gameMetadataUri || 'Not saved'} href={game.artifactManifestUri || game.gameMetadataUri} />
            </>
          ) : (
            <>
              <DetailRow label="Status" value="Not minted yet" />
              <DetailRow label="Chain" value={getChainName(game.nftChainId)} />
              <DetailRow label="Artifact manifest" value={game.artifactManifestUri || game.gameMetadataUri || 'Not saved'} href={game.artifactManifestUri || game.gameMetadataUri} />
              <p className="mt-4 text-sm leading-6 text-white/58">
                Minting is available to the creator after completing a fresh session. Public visitors stay on the saved artifact unless they explicitly start a new session.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
