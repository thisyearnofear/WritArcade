'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

interface Game {
  id: string
  title: string
  slug: string
  description: string
  tagline: string
  genre: string
  subgenre: string
  primaryColor?: string
  promptModel: string
  createdAt: Date
  private: boolean
}

interface GameStats {
  totalGames: number
  publicGames: number
  topGenres: Array<{ genre: string; count: number }>
  recentGames: number
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [stats, setStats] = useState<GameStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true)
        
        // Fetch stats
        const gameStats = await GameDatabaseService.getGameStats()
        setStats(gameStats)

        // Fetch games with filters
        const options: any = {
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
          includePrivate: false, // Only show public games
        }

        if (selectedGenre) {
          options.genre = selectedGenre
        }
        if (searchQuery) {
          options.search = searchQuery
        }

        const fetchedGames = await GameDatabaseService.getGames(options)
        setGames(fetchedGames.games)
      } catch (error) {
        console.error('Failed to fetch games:', error)
        setGames([])
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchGames, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [selectedGenre, searchQuery, currentPage])

  const genres = stats?.topGenres || []

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 px-4 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-gray-800">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-5xl font-bold mb-4">Game Gallery</h1>
            <p className="text-gray-400 text-lg">
              Explore {stats?.publicGames || 0} games created from articles and newsletters
            </p>
          </div>
        </section>

        {/* Stats Section */}
        {stats && (
          <section className="py-8 px-4 border-b border-gray-800">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
                  <div className="text-3xl font-bold text-purple-400">{stats.publicGames}</div>
                  <div className="text-gray-400 mt-2">Public Games</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
                  <div className="text-3xl font-bold text-blue-400">{stats.totalGames}</div>
                  <div className="text-gray-400 mt-2">Total Games</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
                  <div className="text-3xl font-bold text-green-400">{genres.length}</div>
                  <div className="text-gray-400 mt-2">Genres</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Search and Filters */}
        <section className="py-8 px-4 border-b border-gray-800">
          <div className="max-w-6xl mx-auto">
            <div className="space-y-6">
              {/* Search Bar */}
              <div>
                <input
                  type="text"
                  placeholder="Search games by title, description, or genre..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Genre Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Filter by Genre</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedGenre(null)
                      setCurrentPage(1)
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedGenre === null
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    All Genres
                  </button>
                  {genres.map(({ genre, count }) => (
                    <button
                      key={genre}
                      onClick={() => {
                        setSelectedGenre(genre)
                        setCurrentPage(1)
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedGenre === genre
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {genre} <span className="text-xs ml-1">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Games Grid */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">
                  <div className="w-8 h-8 border-4 border-gray-700 border-t-purple-500 rounded-full" />
                </div>
                <p className="text-gray-400 mt-4">Loading games...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No games found. Try adjusting your filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {games.map((game) => (
                    <Link
                      key={game.id}
                      href={`/games/${game.slug}`}
                      className="group bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-purple-500 transition-all hover:shadow-xl hover:shadow-purple-500/20"
                    >
                      <div
                        className="h-32 bg-gradient-to-br opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{
                          background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}40, ${game.primaryColor || '#8b5cf6'}10)`,
                          borderBottom: `2px solid ${game.primaryColor || '#8b5cf6'}`,
                        }}
                      />

                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <span
                              className="inline-block px-2 py-1 text-xs rounded-full border mb-3"
                              style={{
                                borderColor: game.primaryColor || '#8b5cf6',
                                color: game.primaryColor || '#8b5cf6',
                                backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
                              }}
                            >
                              {game.genre}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-2">
                          {game.title}
                        </h3>

                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                          {game.tagline}
                        </p>

                        <div className="text-xs text-gray-500 space-y-1">
                          <p>
                            Generated with <span className="text-gray-400">{game.promptModel}</span>
                          </p>
                          <p>
                            Created {new Date(game.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-12 flex justify-center items-center gap-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border border-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-white transition-colors"
                  >
                    Previous
                  </button>

                  <div className="text-gray-400">
                    Page <span className="font-semibold">{currentPage}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={games.length < itemsPerPage}
                    className="px-4 py-2 rounded-lg border border-gray-800 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
