'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { GameCardEnhanced } from '@/domains/games/components/game-card-enhanced'
import { Game } from '@/domains/games/types'
import { Loader2, Plus } from 'lucide-react'
import Link from 'next/link'

export default function MyGamesPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Require connection
  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }
  }, [isConnected, router])

  // Load user's games
  useEffect(() => {
    if (!address) return

    const loadGames = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Call new /api/games/my-games endpoint
        const response = await fetch(
          `/api/games/my-games?wallet=${encodeURIComponent(address)}&limit=100`
        )
        
        if (!response.ok) {
          throw new Error('Failed to load games')
        }
        
        const data = await response.json()
        if (!data.success || !data.data) {
          throw new Error('Invalid response format')
        }
        
        setGames((data.data.games || []) as Game[])
      } catch (err) {
        console.error('Failed to load games:', err)
        setError('Failed to load your games. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadGames()
  }, [address])

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
          writerCoinId: 'avc',
        }),
      })
      
      if (!prepareResponse.ok) {
        throw new Error('Failed to prepare minting')
      }
      
      const prepareData = await prepareResponse.json()
      if (!prepareData.success) throw new Error(prepareData.error)
      
      // Step 2: Show minting modal or redirect (frontend would handle contract call)
      console.log('Minting prepared:', prepareData.data)
      alert(`Ready to mint! Transaction will cost ${prepareData.data.estimatedCost} AVC tokens.`)
      
      // TODO: Frontend would call contract here and then call PATCH endpoint to confirm
      // For now, just log the data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Minting failed'
      console.error('Mint error:', err)
      alert(message)
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
      
      // Story Protocol registration is optional - this would be a future enhancement
      // For now, show a placeholder message
      console.log('Register game as IP:', gameId)
      alert('Story Protocol registration coming soon! This will allow you to set license terms and earn royalties from derivatives.')
      
      // TODO: Implement full Story Protocol flow when SDK is integrated
      // Would call /api/assets/[id]/register endpoint
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      console.error('Registration error:', err)
      alert(message)
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
      alert(message)
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
      alert(message)
    } finally {
      setActionInProgress(null)
    }
  }

  if (!isConnected) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="py-12 px-4 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-gray-800">
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
            <p className="text-gray-400">
              Manage your created games, mint them as NFTs, and register them as IP assets.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading your games...</p>
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
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-300 mb-3">No games yet</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
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
                <div className="text-sm text-gray-400 mb-6">
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
                      onDeleteClick={() => handleDeleteClick(game.id)}
                      isLoading={actionInProgress === game.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
