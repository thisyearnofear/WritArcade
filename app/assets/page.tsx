'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { EmptyState } from '@/components/ui/empty-state'
import { AlertCircle, PackageOpen, SearchX } from 'lucide-react'

// Asset type mirrored here to avoid importing prisma-dependent service on client
interface Asset {
  id: string
  title: string
  description: string
  type: string
  genre: string
  tags: string[]
  content?: unknown
  articleUrl?: string
  createdAt?: string | Date
}

const ASSET_TYPES = ['character', 'mechanic', 'plot', 'world', 'dialog']
const GENRES = ['Horror', 'Comedy', 'Mystery', 'Sci-Fi', 'Fantasy', 'Adventure']

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalAssets, setTotalAssets] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 12

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // P0 FIX: was importing AssetMarketplaceService (Prisma) directly in client component.
      // Now uses the existing GET /api/assets/marketplace API route instead.
      const params = new URLSearchParams()
      params.set('limit', ITEMS_PER_PAGE.toString())
      params.set('offset', (currentPage * ITEMS_PER_PAGE).toString())
      if (searchTerm) params.set('search', searchTerm)
      if (selectedType) params.set('type', selectedType)
      if (selectedGenre) params.set('genre', selectedGenre.toLowerCase())

      const res = await fetch(`/api/assets/marketplace?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()

      if (!json.success) throw new Error(json.error || 'Failed to load assets')

      const data = json.data || {}
      setAssets(data.assets || [])
      setTotalAssets(data.total || 0)
      setHasMore(data.hasMore ?? false)
    } catch (error) {
      console.error('Failed to load assets:', error)
      setAssets([])
      setTotalAssets(0)
      setHasMore(false)
      setError('Asset marketplace could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedType, selectedGenre, currentPage])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(0)
  }

  const handleTypeFilter = (type: string | null) => {
    setSelectedType(type)
    setSelectedGenre(null)
    setCurrentPage(0)
  }

  const handleGenreFilter = (genre: string | null) => {
    setSelectedGenre(genre)
    setSelectedType(null)
    setCurrentPage(0)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedType(null)
    setSelectedGenre(null)
    setCurrentPage(0)
  }

  const hasActiveFilters = Boolean(searchTerm || selectedType || selectedGenre)

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-1 py-12 px-4 bg-gradient-to-br from-purple-900/30 to-pink-900/20">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Asset Marketplace</h1>
            <p className="text-sm text-purple-200">Remixable primitives for your games</p>
            <p className="text-slate-300">
              Browse reusable game components. Mix and match to create unique games.
            </p>
          </div>
          <Link
            href="/assets/create"
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition whitespace-nowrap shadow-[0_0_0_1px_rgba(168,85,247,0.35)]"
          >
            + Create Game
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search assets by name, description..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black/40 border border-purple-700/50 text-white placeholder-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Filters */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asset Type Filter */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Asset Type</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTypeFilter(null)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  selectedType === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                All
              </button>
              {ASSET_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeFilter(type)}
                  className={`px-3 py-1 rounded-full text-sm capitalize transition ${
                    selectedType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Genre Filter */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Genre</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleGenreFilter(null)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  selectedGenre === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                All
              </button>
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleGenreFilter(genre)}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    selectedGenre === genre
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 text-slate-400 text-sm">
          {totalAssets > 0 && (
            <p>Showing {assets.length} of {totalAssets} assets</p>
          )}
        </div>

        {/* Asset Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12" aria-label="Loading assets">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-black/50 border border-purple-700/30 rounded-lg p-4 animate-pulse">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="h-5 w-2/3 rounded bg-slate-700" />
                  <div className="h-5 w-16 rounded bg-purple-800/60" />
                </div>
                <div className="space-y-2 mb-5">
                  <div className="h-3 rounded bg-slate-800" />
                  <div className="h-3 w-4/5 rounded bg-slate-800" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded bg-slate-800" />
                  <div className="flex gap-2">
                    <div className="h-5 w-12 rounded bg-purple-900/60" />
                    <div className="h-5 w-12 rounded bg-purple-900/60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Assets did not load"
            description={error}
            action={{ label: 'Try again', onClick: loadAssets }}
            className="border border-red-500/30 rounded-lg bg-red-950/20 text-white"
          />
        ) : assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {assets.map((asset) => (
              <Link href={`/assets/${asset.id}`} key={asset.id}>
                <div className="bg-black/50 border border-purple-700/40 rounded-lg overflow-hidden hover:bg-black/60 hover:border-purple-500/60 transition cursor-pointer h-full shadow-[0_0_0_1px_rgba(168,85,247,0.25)]">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-white flex-1">{asset.title}</h3>
                      <span className="text-xs bg-purple-700 text-white px-2 py-1 rounded capitalize">
                        {asset.type}
                      </span>
                    </div>
                    <p className="text-purple-100/90 text-sm mb-3 line-clamp-2">
                      {asset.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-purple-200/80">
                      <span className="capitalize">{asset.genre}</span>
                      <div className="flex gap-1">
                        {asset.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="bg-purple-800/50 border border-purple-600/50 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={hasActiveFilters ? SearchX : PackageOpen}
            title={hasActiveFilters ? 'No matching assets' : 'No remixable assets yet'}
            description={
              hasActiveFilters
                ? 'Clear the current filters to browse the full marketplace.'
                : 'Create a game from an article first. Reusable characters, mechanics, worlds, and plot pieces will appear here as the library grows.'
            }
            action={
              hasActiveFilters
                ? { label: 'Clear filters', onClick: clearFilters }
                : { label: 'Create from article', href: '/generate' }
            }
            className="border border-dashed border-purple-700/50 rounded-lg bg-black/30 text-white"
          />
        )}

        {/* Pagination */}
        {hasMore || currentPage > 0 ? (
          <div className="flex justify-center gap-4 mt-12">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-slate-300">Page {currentPage + 1}</span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!hasMore}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      </main>

      <Footer />
    </div>
  )
}
