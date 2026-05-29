'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { GameCardEnhanced } from '@/domains/games/components/game-card-enhanced'
import { Game } from '@/domains/games/types'
import { GameSettingsModal } from '@/domains/games/components/game-settings-modal'
import { IPRegistrationHistory } from '@/components/story/IPRegistrationHistory'
import { Plus, Gamepad2, Shield } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function MyGamesPage() {
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
  const [sessionAllowed, setSessionAllowed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTab, setActiveTab] = useState<'games' | 'ip-registrations'>('games')

  // Require connection, but wait for status to resolve to avoid false redirects
  // Guard against 'connecting' AND 'reconnecting' — both are transient states
  // that may resolve to 'connected'. Redirecting during 'reconnecting' would
  // incorrectly kick out a valid session on page refresh.
  useEffect(() => {
    if (status === 'connecting' || status === 'reconnecting') return
    if (!isConnected) {
      // Allow session-based authenticated users to access if cookie-based session exists
      // We check via a lightweight ping to /api/auth/me
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

  // Load user's games
  useEffect(() => {
    if (!authChecked || !sessionAllowed) return
    // If no wallet address yet, try session-based fetch (API will infer from cookie)
    if (!address && isConnected !== true) return

    const loadGames = async () => {
      try {
        setLoading(true)
        setError(null)

        // Call new /api/games/my-games endpoint
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

      // Step 1: Prepare minting (get metadata + contract details)
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

      // Minting prepared - user can now proceed with wallet signature
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

      // Story Protocol registration: user signs with wallet on Story chain
      // to register IP asset and set license terms for derivative royalties
      console.log('Registering game as IP on Story Protocol:', gameId)
      
      // Call the Story Protocol registration endpoint
      // User's wallet signs the transaction client-side
      const response = await fetch(`/api/assets/${gameId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorWallet: address })
      })

      if (!response.ok) throw new Error('Registration failed')
      
      const data = await response.json()
      toast({ 
        title: 'IP Registered', 
        description: `Story Protocol IP ID: ${data.registration?.storyIpId}`, 
        variant: 'default' 
      })
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

      // Call visibility toggle endpoint
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

      // Update local state
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

      // Check if game is minted (prevent deletion)
      if (game.nftTokenId) {
        throw new Error('Cannot delete games that have been minted as NFTs. NFT records are permanent on-chain.')
      }

      // Call delete endpoint
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

      // Remove from local state
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

      // Update local state
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
      throw err // Re-throw to be handled by modal
    }
  }

  if (!isConnected) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 overflow-y-auto">
        {/* Page Header */}
        <section className="py-12 px-4 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold">My Games</h1>
              <Link
                href="/generate"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create New Game
              </Link>
            </div>
            <p className="text-muted-foreground">
              Manage your created games, mint them as NFTs, and register them as IP assets.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mb-8 border-b border-border">
              <button
                onClick={() => setActiveTab('games')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'games'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                My Games
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-muted">
                  {games.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ip-registrations')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'ip-registrations'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-4 h-4" />
                IP Registrations
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'ip-registrations' ? (
              <IPRegistrationHistory />
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
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <h2 className="text-xl font-semibold text-foreground mb-3">No games yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first game by pasting a Paragraph.xyz article URL. You can then mint it as an NFT or register it as an IP asset.
                </p>
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Game
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-6">
                  You have <span className="font-semibold text-white">{games.length}</span> game{games.length !== 1 ? 's' : ''}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {games.map((game) => (
                    <GameCardEnhanced
                      key={game.id}
                      game={game}
                      isUserGame={true}
                      onMintClick={() => handleMintClick(game.id)}
                      onRegisterClick={() => handleRegisterClick(game.id)}
                      onToggleVisibility={() => handleToggleVisibility(game.id, !game.private)}
                      onSettingsClick={() => setSettingsGame(game)}
                      onDeleteClick={() => handleDeleteClick(game.id)}
                      isLoading={actionInProgress === game.id}
                    />
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
          </div>
        </section>
      </main>

      <Footer />
      <Toaster />
    </div>
  )
}
