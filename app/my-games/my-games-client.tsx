'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { GameCardEnhanced } from '@/domains/games/components/game-card-enhanced'
import { RecentlyPlayedSection } from '@/domains/games/components/recently-played-section'
import { Game } from '@/domains/games/types'
import { GameSettingsModal } from '@/domains/games/components/game-settings-modal'
import { IPRegistrationHistory } from '@/components/story/IPRegistrationHistory'
import { IPRegistration } from '@/components/story/IPRegistration'
import { Plus, Gamepad2, X, Library, BadgeCheck, Network, Eye, Lock, Copy, Check, GalleryHorizontalEnd, ExternalLink, AlertTriangle, Sparkles, ChevronDown } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
    </div>
  )
}

type UnlockedVault = {
  gameSlug: string
  vaultUuid: string
  nftContract?: string | null
  nftTokenId?: string | null
  nftChainId?: number | null
  walletAddress?: string | null
  unlockedAt: string
  shareUrl: string
}

const UNLOCKED_VAULTS_KEY = 'writersarcade.unlockedVaults'

export function MyGamesClient() {
  const { toast } = useToast()
  const router = useRouter()
  const { address, isConnected, status } = useAccount()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(12)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [mintConfirmGame, setMintConfirmGame] = useState<Game | null>(null)
  const [deleteConfirmGame, setDeleteConfirmGame] = useState<Game | null>(null)
  const [settingsGame, setSettingsGame] = useState<Game | null>(null)
  const [registrationGame, setRegistrationGame] = useState<Game | null>(null)
  const [sessionAllowed, setSessionAllowed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<'library' | 'vault' | 'collectibles'>('library')
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'played' | 'unplayed' | 'minted' | 'daily'>('all')
  const [showAdvancedTabs, setShowAdvancedTabs] = useState(false)
  const [unlockedVaults, setUnlockedVaults] = useState<UnlockedVault[]>([])
  const [copiedVault, setCopiedVault] = useState<string | null>(null)
  const stats = useMemo(() => {
    const minted = games.filter(game => !!game.nftTokenId).length
    const registered = games.filter(game => !!game.storyIpId).length
    const publicGames = games.filter(game => !game.private).length
    const played = games.filter(game => (game.playCount ?? 0) > 0).length
    const superrareMinted = games.filter(game => !!game.superrareTokenId).length
    return { minted, registered, publicGames, played, superrareMinted }
  }, [games])

  const filteredGames = useMemo(() => {
    switch (libraryFilter) {
      case 'played':
        return games.filter(game => (game.playCount ?? 0) > 0)
      case 'unplayed':
        return games.filter(game => (game.playCount ?? 0) === 0)
      case 'minted':
        return games.filter(game => !!game.nftTokenId)
      case 'daily':
        return games.filter(game => game.hasDailySession)
      default:
        return games
    }
  }, [games, libraryFilter])

  const libraryFilters = [
    { id: 'all' as const, label: 'All', count: games.length },
    { id: 'played' as const, label: 'Played', count: stats.played },
    { id: 'unplayed' as const, label: 'Not played', count: games.length - stats.played },
    { id: 'minted' as const, label: 'Minted', count: stats.minted },
    { id: 'daily' as const, label: 'Daily', count: games.filter(g => g.hasDailySession).length },
  ]

  const hasOwnershipMilestone =
    stats.minted > 0 ||
    stats.registered > 0 ||
    unlockedVaults.length > 0 ||
    stats.superrareMinted > 0

  const [milestoneNudgeDismissed, setMilestoneNudgeDismissed] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('writersarcade.milestone-nudge-dismissed') === '1') {
        setMilestoneNudgeDismissed(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const dismissMilestoneNudge = () => {
    setMilestoneNudgeDismissed(true)
    try {
      sessionStorage.setItem('writersarcade.milestone-nudge-dismissed', '1')
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(UNLOCKED_VAULTS_KEY) || '[]')
      setUnlockedVaults(Array.isArray(stored) ? stored : [])
    } catch {
      setUnlockedVaults([])
    }
  }, [])

  useEffect(() => {
    if (loading || games.length === 0) return
    const hash = window.location.hash?.replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.animate(
        [{ boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.5)' }, { boxShadow: '0 0 0 8px rgba(168, 85, 247, 0)' }],
        { duration: 900, easing: 'ease-out' },
      )
    }
  }, [loading, games])

  const copyVaultLink = async (vault: UnlockedVault) => {
    try {
      await navigator.clipboard.writeText(vault.shareUrl)
      setCopiedVault(vault.vaultUuid)
      setTimeout(() => setCopiedVault(null), 1500)
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy the vault link.', variant: 'destructive' })
    }
  }

  useEffect(() => {
    if (status === 'connecting' || status === 'reconnecting') return
    if (!isConnected) {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data?.success && data?.user?.walletAddress) {
            setSessionAllowed(true)
          } else {
            router.push('/')
          }
        })
        .catch(() => router.push('/'))
        .finally(() => setAuthChecked(true))
      return
    }
    setAuthChecked(true)
    setSessionAllowed(true)
  }, [isConnected, status, router])

  useEffect(() => {
    if (!authChecked || !sessionAllowed) return
    if (!address && isConnected !== true) return

    const loadGames = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          address
            ? `/api/games/my-games?wallet=${encodeURIComponent(address)}&limit=100`
            : `/api/games/my-games?limit=100`
        )

        if (!response.ok) {
          throw new Error('Failed to load games')
        }

        const data = await response.json()
        if (!data.success || !data.data) {
          throw new Error('Invalid response format')
        }

        setGames((data.data.games || []) as Game[])
        setTotal(data.data.total ?? 0)
        setLimit(data.data.limit ?? 12)
        setOffset(data.data.offset ?? 0)
      } catch (err) {
        console.error('Failed to load games:', err)
        setError('Failed to load your games. Please try again.')
        toast({
          title: 'Failed to load games',
          description: 'Please try again in a moment.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [address, status, authChecked, sessionAllowed, isConnected, toast])

  const handleMintClick = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    if (game) setMintConfirmGame(game)
  }

  const handleMintConfirmed = async () => {
    const game = mintConfirmGame
    if (!game || !address) return

    setMintConfirmGame(null)
    setActionInProgress(game.id)
    try {
      const prepareResponse = await fetch('/api/games/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: game.id,
          gameSlug: game.slug,
          wallet: address,
          writerCoinId: game.writerCoinId ?? 'avc',
        }),
      })

      if (!prepareResponse.ok) {
        throw new Error('Failed to prepare minting')
      }

      const prepareData = await prepareResponse.json()
      if (!prepareData.success) throw new Error(prepareData.error)

      const coinSymbol = prepareData.data.symbol ?? (game.writerCoinId?.toUpperCase() ?? 'AVC')
      toast({ title: 'Ready to mint', description: `Estimated cost: ${prepareData.data.estimatedCost} ${coinSymbol}`, variant: 'default' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Minting failed'
      console.error('Mint error:', err)
      toast({ title: 'Minting failed', description: message, variant: 'destructive' })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleRegisterClick = async (gameId: string) => {
    if (!address) return

    setActionInProgress(gameId)
    try {
      const game = games.find(g => g.id === gameId)
      if (!game) throw new Error('Game not found')

      setRegistrationGame(game)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      console.error('Registration error:', err)
      toast({ title: 'Registration failed', description: message, variant: 'destructive' })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleToggleVisibility = async (gameId: string, isPrivate: boolean) => {
    if (!address) return

    setActionInProgress(gameId)
    try {
      const game = games.find(g => g.id === gameId)
      if (!game) throw new Error('Game not found')

      const response = await fetch(`/api/games/${game.slug}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visible: !isPrivate,
          wallet: address,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update visibility')
      }

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      setGames(games.map(g => g.id === gameId ? { ...g, private: data.data.private } : g))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update visibility'
      console.error('Visibility toggle error:', err)
      toast({ title: 'Failed to update visibility', description: message, variant: 'destructive' })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeleteClick = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    if (game) setDeleteConfirmGame(game)
  }

  const handleDeleteConfirmed = async () => {
    const game = deleteConfirmGame
    if (!game || !address) return

    setDeleteConfirmGame(null)
    setActionInProgress(game.id)
    try {
      if (game.nftTokenId) {
        throw new Error('Cannot delete games that have been minted as NFTs. NFT records are permanent on-chain.')
      }

      const response = await fetch(`/api/games/${game.slug}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete game')
      }

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      setGames(games.filter(g => g.id !== game.id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete game'
      console.error('Delete error:', err)
      toast({ title: 'Delete failed', description: message, variant: 'destructive' })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleSettingsUpdate = async (slug: string, updates: { playFee?: string; private?: boolean }) => {
    if (!address) return

    try {
      const response = await fetch(`/api/games/${slug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          wallet: address,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      const data = await response.json()
      if (!data.success) throw new Error(data.error)

      setGames(games.map(g => {
        if (g.slug === slug) {
          return {
            ...g,
            private: updates.private !== undefined ? updates.private : g.private,
            playFee: updates.playFee !== undefined ? updates.playFee : g.playFee,
          }
        }
        return g
      }))
    } catch (err) {
      console.error('Settings update error:', err)
      throw err
    }
  }

  if (!isConnected) {
    return null
  }

  return (
    <ThemeWrapper theme="arcade">
      <div className="min-h-screen flex flex-col">
        <Header />

      <main className="flex-1 overflow-y-auto">
        <section className="py-10 px-4 border-b border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Library</p>
                <h1 className="text-3xl sm:text-4xl font-bold">My Games</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Play your generated games first. Mint, secret epilogue unlock, and IP registration live under Ownership on each card.
                </p>
              </div>
              <Link
                href="/generate"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
                Create New Game
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile icon={Library} label="Ready to play" value={games.length} />
              <StatTile icon={Gamepad2} label="Played" value={stats.played} />
              <StatTile icon={BadgeCheck} label="Minted" value={stats.minted} />
              <StatTile icon={Network} label="IP Registered" value={stats.registered} />
            </div>
          </div>
        </section>

        <section className="px-4 pb-2">
          <div className="max-w-6xl mx-auto">
            <RecentlyPlayedSection />
          </div>
        </section>

        <section className="px-4 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('library')}
                  className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
                    activeTab === 'library'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  Library
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                    {games.length}
                  </span>
                </button>
                {(showAdvancedTabs || activeTab !== 'library') && (
                  <>
                    <button
                      onClick={() => setActiveTab('vault')}
                      className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
                        activeTab === 'vault'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      Vault
                      <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                        {unlockedVaults.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveTab('collectibles')}
                      className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
                        activeTab === 'collectibles'
                          ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <GalleryHorizontalEnd className="w-4 h-4" />
                      Collectibles
                      <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                        {stats.superrareMinted}
                      </span>
                    </button>
                  </>
                )}
              </div>
              {activeTab === 'library' && hasOwnershipMilestone && !showAdvancedTabs && (
                <button
                  type="button"
                  onClick={() => setShowAdvancedTabs(true)}
                  className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Vault & collectibles
                  {(stats.registered > 0 || unlockedVaults.length > 0) && (
                    <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-400">New</span>
                  )}
                </button>
              )}
              {activeTab === 'library' && hasOwnershipMilestone && !showAdvancedTabs && !milestoneNudgeDismissed && stats.minted > 0 && (
                <div className="rounded-lg border border-purple-500/25 bg-purple-500/5 px-4 py-3 text-sm">
                  <p className="text-foreground">
                    You minted {stats.minted} game{stats.minted !== 1 ? 's' : ''}. Unlocked secrets, IP history, and collectibles live under{' '}
                    <span className="font-medium text-purple-400">Vault & collectibles</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvancedTabs(true)
                      dismissMilestoneNudge()
                    }}
                    className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300"
                  >
                    Open vault →
                  </button>
                </div>
              )}
              {activeTab !== 'library' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('library')
                    setShowAdvancedTabs(false)
                  }}
                  className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-purple-400 hover:text-purple-300"
                >
                  ← Back to library
                </button>
              )}
            </div>

            {activeTab === 'collectibles' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">SuperRare NFT Gallery</h2>
                  <p className="text-sm text-muted-foreground">
                    Game artifacts minted as SuperRare collectibles. Character cards, story artifacts, and limited editions.
                  </p>
                </div>
                {games.filter(g => !!g.superrareTokenId).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-12 text-center sm:py-16">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-pink-500/10 text-pink-300">
                      <GalleryHorizontalEnd className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">No SuperRare collectibles yet</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Mint your game artifacts as SuperRare NFTs to build your collection.
                    </p>
                    <Link
                      href="/games"
                      className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-pink-700"
                    >
                      Browse Games
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {games.filter(g => !!g.superrareTokenId).map((game) => (
                      <div key={game.id} className="rounded-lg border border-pink-500/20 bg-card p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className="inline-flex items-center gap-1 rounded-full border border-pink-400/30 bg-pink-500/10 px-2.5 py-1 text-xs font-semibold text-pink-300">
                            <GalleryHorizontalEnd className="w-3 h-3" />
                            SuperRare
                          </span>
                          <span className="text-xs text-muted-foreground">#{game.superrareTokenId}</span>
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">{game.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{game.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{game.genre}</span>
                          <Link
                            href={`/games/${game.slug}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-pink-400 hover:text-pink-300"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        {game.superrareMintedAt && (
                          <p className="mt-3 text-[10px] text-muted-foreground">
                            Minted {new Date(game.superrareMintedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'vault' ? (
              <div className="space-y-10">
                {unlockedVaults.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                      <Lock className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-2">No unlocked secrets yet</h2>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                      Finish a story, mint the NFT, then decrypt the secret epilogue.
                    </p>
                    <Link href="/games" className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
                      Browse arcade →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Unlocked secrets</h2>
                      <p className="text-sm text-muted-foreground">Secret epilogue receipts on this device.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {unlockedVaults.map((vault) => (
                        <div key={`${vault.gameSlug}-${vault.vaultUuid}`} className="rounded-lg border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Secret epilogue</p>
                              <h3 className="mt-1 text-base font-semibold text-foreground">{vault.gameSlug.replace(/-/g, ' ')}</h3>
                            </div>
                            <Link href={vault.shareUrl || `/games/${vault.gameSlug}`} className="text-xs font-semibold text-purple-400 hover:text-purple-300">
                              Open
                            </Link>
                          </div>
                          <dl className="mt-4 grid gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                              <dt>On-chain ref</dt>
                              <dd className="font-mono text-foreground">{vault.vaultUuid.length > 18 ? `${vault.vaultUuid.slice(0, 10)}…${vault.vaultUuid.slice(-6)}` : vault.vaultUuid}</dd>
                            </div>
                            {vault.nftTokenId && (
                              <div className="flex items-center justify-between gap-3">
                                <dt>Gate NFT</dt>
                                <dd className="font-mono text-foreground">#{vault.nftTokenId}</dd>
                              </div>
                            )}
                          </dl>
                          <button
                            type="button"
                            onClick={() => copyVaultLink(vault)}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/80"
                          >
                            {copiedVault === vault.vaultUuid ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copiedVault === vault.vaultUuid ? 'Copied' : 'Copy unlock link'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-border pt-8">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-foreground">IP registrations</h2>
                    <p className="text-sm text-muted-foreground">Story Protocol registrations for games you own.</p>
                  </div>
                  <IPRegistrationHistory />
                </div>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="h-20 rounded bg-muted" />
                    <div className="h-4 rounded bg-muted w-2/3" />
                    <div className="h-3 rounded bg-muted w-full" />
                    <div className="h-3 rounded bg-muted w-5/6" />
                    <div className="flex gap-2 pt-2">
                      <div className="h-9 w-24 rounded bg-muted" />
                      <div className="h-9 w-20 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : games.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-12 text-center sm:py-16">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
                  <Gamepad2 className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-3">Your library is empty</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Paste an article to create your first game — or browse the arcade and play something public first.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/games"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <Gamepad2 className="w-5 h-5" />
                    Browse arcade
                  </Link>
                  <Link
                    href="/generate"
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
                  >
                    <Plus className="w-5 h-5" />
                    Create first game
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Playable library</h2>
                    <p className="text-sm text-muted-foreground">
                      {games.length} game{games.length !== 1 ? 's' : ''} ready to play or manage.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Play first. Expand Ownership on a card when you are ready to mint or register IP.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {libraryFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={libraryFilter === filter.id}
                      onClick={() => setLibraryFilter(filter.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        libraryFilter === filter.id
                          ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {filter.label}
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{filter.count}</span>
                    </button>
                  ))}
                </div>

                {filteredGames.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      {libraryFilter === 'played' && 'No played games yet — pick one from All and hit Play.'}
                      {libraryFilter === 'unplayed' && 'You have played every game in your library.'}
                      {libraryFilter === 'minted' && 'No minted games yet. Finish a playthrough, then mint from Ownership on a card.'}
                      {libraryFilter === 'daily' && 'No daily challenge sessions yet. Try today\'s modifier from the Daily tab.'}
                    </p>
                    {libraryFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setLibraryFilter('all')}
                        className="mt-4 text-sm font-medium text-purple-400 hover:text-purple-300"
                      >
                        Show all games
                      </button>
                    )}
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGames.map((game) => (
                    <div key={game.id} id={game.id} className="scroll-mt-24">
                      <GameCardEnhanced
                        game={game}
                        isUserGame={true}
                        onMintClick={() => handleMintClick(game.id)}
                        onRegisterClick={() => handleRegisterClick(game.id)}
                        onToggleVisibility={() => handleToggleVisibility(game.id, !game.private)}
                        onSettingsClick={() => setSettingsGame(game)}
                        onDeleteClick={() => handleDeleteClick(game.id)}
                        isLoading={actionInProgress === game.id}
                      />
                    </div>
                  ))}
                </div>
                )}

                {(offset + games.length) < total && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={async () => {
                        try {
                          setLoadingMore(true)
                          const nextOffset = offset + limit
                          const response = await fetch(
                            address
                              ? `/api/games/my-games?wallet=${encodeURIComponent(address)}&limit=${limit}&offset=${nextOffset}`
                              : `/api/games/my-games?limit=${limit}&offset=${nextOffset}`
                          )
                          if (!response.ok) throw new Error('Failed to load more')
                          const data = await response.json()
                          if (!data.success) throw new Error('Failed to load more')
                          setGames(prev => [...prev, ...((data.data.games || []) as Game[])])
                          setOffset(data.data.offset ?? nextOffset)
                          setTotal(data.data.total ?? total)
                        } catch (err) {
                          console.error('Load more error:', err)
                          toast({ title: 'Load more failed', description: 'Please try again later.', variant: 'destructive' })
                        } finally {
                          setLoadingMore(false)
                        }
                      }}
                      className="px-6 py-2 rounded bg-muted hover:bg-muted/80 border border-border text-sm"
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <GameSettingsModal
              game={settingsGame}
              isOpen={!!settingsGame}
              onClose={() => setSettingsGame(null)}
              onUpdate={handleSettingsUpdate}
            />

            {registrationGame && address && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                <div className="w-full max-w-2xl">
                  <div className="mb-3 flex justify-end">
                    <button
                      onClick={() => setRegistrationGame(null)}
                      className="rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
                      aria-label="Close IP registration"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <IPRegistration
                    game={{
                      gameId: registrationGame.id,
                      title: registrationGame.title,
                      description: registrationGame.description,
                      articleUrl: registrationGame.articleUrl || '',
                      gameCreatorAddress: address,
                      authorParagraphUsername: registrationGame.authorParagraphUsername || 'Unknown Author',
                      authorWalletAddress: registrationGame.authorWallet || '0x0000000000000000000000000000000000000000',
                      genre: ['horror', 'comedy', 'mystery'].includes(registrationGame.genre.toLowerCase())
                        ? registrationGame.genre.toLowerCase() as 'horror' | 'comedy' | 'mystery'
                        : 'mystery',
                      difficulty: registrationGame.difficulty === 'hard' ? 'hard' : 'easy',
                    }}
                    onRegistrationComplete={async (result) => {
                      const response = await fetch(`/api/games/${registrationGame.slug}/story-registration`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          walletAddress: address,
                          storyIpId: result.ipId,
                          transactionHash: result.txHash,
                        }),
                      })
                      if (!response.ok) {
                        throw new Error('Story registration succeeded, but saving it to the game failed.')
                      }
                      setGames(prev => prev.map(game => game.id === registrationGame.id
                        ? {
                            ...game,
                            storyIpId: result.ipId,
                            storyRegistrationTxHash: result.txHash,
                            storyRegisteredAt: new Date(result.registeredAt * 1000),
                          }
                        : game
                      ))
                      toast({
                        title: 'IP Registered',
                        description: `Story Protocol IP ID: ${result.ipId.slice(0, 10)}...${result.ipId.slice(-6)}`,
                        variant: 'default',
                      })
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
      </div>

      <Dialog open={!!mintConfirmGame} onOpenChange={(open) => !open && setMintConfirmGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mint as NFT</DialogTitle>
            <DialogDescription>
              This will mint your game as a permanent on-chain NFT. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {mintConfirmGame && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-purple-900/20 border border-purple-500/30 p-3 text-sm">
                <p className="font-semibold text-purple-100">{mintConfirmGame.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{mintConfirmGame.genre} · {mintConfirmGame.difficulty}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Make sure your wallet has enough funds for gas and the mint fee.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMintConfirmGame(null)}>Cancel</Button>
            <Button onClick={handleMintConfirmed} className="bg-purple-600 hover:bg-purple-500">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Confirm Mint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmGame} onOpenChange={(open) => !open && setDeleteConfirmGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete game?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The game will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          {deleteConfirmGame && (
            <div className="rounded-lg bg-red-900/20 border border-red-500/30 p-3 text-sm">
              <p className="font-semibold text-red-100">{deleteConfirmGame.title}</p>
              {deleteConfirmGame.nftTokenId && (
                <p className="text-xs text-red-300 mt-2">
                  This game has an NFT minted (Token #{deleteConfirmGame.nftTokenId}). NFT records are permanent on-chain and cannot be deleted.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmGame(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmed}
              disabled={!!deleteConfirmGame?.nftTokenId}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeWrapper>
  )
}
