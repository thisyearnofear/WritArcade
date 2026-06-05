'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { GameCardEnhanced } from '@/domains/games/components/game-card-enhanced'
import { Game } from '@/domains/games/types'
import { GameSettingsModal } from '@/domains/games/components/game-settings-modal'
import { IPRegistrationHistory } from '@/components/story/IPRegistrationHistory'
import { IPRegistration } from '@/components/story/IPRegistration'
import { Plus, Gamepad2, Shield, X, Library, BadgeCheck, Network, Eye, Lock, Copy, Check } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'
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
  const [settingsGame, setSettingsGame] = useState<Game | null>(null)
  const [registrationGame, setRegistrationGame] = useState<Game | null>(null)
  const [sessionAllowed, setSessionAllowed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<'games' | 'unlocked-vaults' | 'ip-registrations'>('games')
  const [unlockedVaults, setUnlockedVaults] = useState<UnlockedVault[]>([])
  const [copiedVault, setCopiedVault] = useState<string | null>(null)
  const stats = useMemo(() => {
    const minted = games.filter(game => !!game.nftTokenId).length
    const registered = games.filter(game => !!game.storyIpId).length
    const publicGames = games.filter(game => !game.private).length
    return { minted, registered, publicGames }
  }, [games])

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

  const handleMintClick = async (gameId: string) => {
    if (!address) return

    setActionInProgress(gameId)
    try {
      const game = games.find(g => g.id === gameId)
      if (!game) throw new Error('Game not found')

      const prepareResponse = await fetch('/api/games/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
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

      console.log('Minting prepared:', prepareData.data)
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

  const handleDeleteClick = async (gameId: string) => {
    if (!address) return

    if (!window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return
    }

    setActionInProgress(gameId)
    try {
      const game = games.find(g => g.id === gameId)
      if (!game) throw new Error('Game not found')

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

      setGames(games.filter(g => g.id !== gameId))
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
                  Play your generated games first. Minting, IP registration, sharing, and settings live here when you are ready to manage ownership.
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

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatTile icon={Library} label="Games" value={games.length} />
              <StatTile icon={Eye} label="Public" value={stats.publicGames} />
              <StatTile icon={BadgeCheck} label="Minted" value={stats.minted} />
              <StatTile icon={Network} label="IP Registered" value={stats.registered} />
              <StatTile icon={Lock} label="Vaults" value={unlockedVaults.length} />
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex items-center gap-2 overflow-x-auto border-b border-border">
              <button
                onClick={() => setActiveTab('games')}
                className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
                  activeTab === 'games'
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
              <button
                onClick={() => setActiveTab('ip-registrations')}
                className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
                  activeTab === 'ip-registrations'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-4 h-4" />
                Ownership History
              </button>
              <button
                onClick={() => setActiveTab('unlocked-vaults')}
                className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
                  activeTab === 'unlocked-vaults'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="w-4 h-4" />
                Unlocked Vaults
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                  {unlockedVaults.length}
                </span>
              </button>
            </div>

            {activeTab === 'ip-registrations' ? (
              <IPRegistrationHistory />
            ) : activeTab === 'unlocked-vaults' ? (
              unlockedVaults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-12 text-center sm:py-16">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                    <Lock className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">No vaults unlocked yet</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Finish a 5-panel game, mint the NFT, then decrypt the CDR vault to add it here.
                  </p>
                  <Link
                    href="/games"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Browse Games
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Vaults You've Unlocked</h2>
                    <p className="text-sm text-muted-foreground">
                      CDR unlock receipts saved on this device. Each one links back to the game and gate NFT.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {unlockedVaults.map((vault) => (
                      <div key={`${vault.gameSlug}-${vault.vaultUuid}`} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">CDR Vault</p>
                            <h3 className="mt-1 text-base font-semibold text-foreground">{vault.gameSlug.replace(/-/g, ' ')}</h3>
                          </div>
                          <Link href={vault.shareUrl || `/games/${vault.gameSlug}`} className="text-xs font-semibold text-purple-400 hover:text-purple-300">
                            Open
                          </Link>
                        </div>
                        <dl className="mt-4 grid gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between gap-3">
                            <dt>Vault UUID</dt>
                            <dd className="font-mono text-foreground">{vault.vaultUuid.length > 18 ? `${vault.vaultUuid.slice(0, 10)}…${vault.vaultUuid.slice(-6)}` : vault.vaultUuid}</dd>
                          </div>
                          {vault.nftTokenId && (
                            <div className="flex items-center justify-between gap-3">
                              <dt>Gate NFT</dt>
                              <dd className="font-mono text-foreground">#{vault.nftTokenId}</dd>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <dt>Unlocked</dt>
                            <dd className="text-foreground">{new Date(vault.unlockedAt).toLocaleString()}</dd>
                          </div>
                        </dl>
                        <button
                          type="button"
                          onClick={() => copyVaultLink(vault)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/80"
                        >
                          {copiedVault === vault.vaultUuid ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copiedVault === vault.vaultUuid ? 'Copied' : 'Copy Unlock Link'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
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
                  Paste an article, preview the source, and create your first playable story. Ownership options can wait until after you play.
                </p>
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  <Plus className="w-5 h-5" />
                  Create First Game
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Playable Library</h2>
                    <p className="text-sm text-muted-foreground">
                      {games.length} game{games.length !== 1 ? 's' : ''} ready to play or manage.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Primary action is always Play. Ownership actions stay grouped on each card.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {games.map((game) => (
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
      <Toaster />
      </div>
    </ThemeWrapper>
  )
}
