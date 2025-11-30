'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AssetMarketplaceService } from '@/domains/assets/services/asset-marketplace.service'
import type { Asset } from '@/domains/assets/services/asset-database.service'

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

  const ITEMS_PER_PAGE = 12

  useEffect(() => {
    loadAssets()
  }, [searchTerm, selectedType, selectedGenre, currentPage])

  const loadAssets = async () => {
    setLoading(true)
    try {
      let result

      if (searchTerm) {
        result = await AssetMarketplaceService.searchAssets(
          searchTerm,
          ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
        )
      } else if (selectedType) {
        result = await AssetMarketplaceService.getAssetsByType(selectedType, ITEMS_PER_PAGE)
      } else if (selectedGenre) {
        result = await AssetMarketplaceService.getAssetsByGenre(
          selectedGenre.toLowerCase(),
          ITEMS_PER_PAGE
        )
      } else {
        result = await AssetMarketplaceService.getFeaturedAssets(ITEMS_PER_PAGE)
      }

      setAssets(result.assets || [])
      setTotalAssets(result.total || 0)
      setHasMore(result.hasMore || false)
    } catch (error) {
      console.error('Failed to load assets:', error)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">Asset Marketplace</h1>
            <p className="text-slate-300">
              Browse reusable game components. Mix and match to create unique games.
            </p>
          </div>
          <Link
            href="/assets/create"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
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
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="text-center py-12">
            <div className="text-slate-300">Loading assets...</div>
          </div>
        ) : assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {assets.map((asset) => (
              <Link href={`/assets/${asset.id}`} key={asset.id}>
                <div className="bg-slate-700 rounded-lg overflow-hidden hover:bg-slate-600 transition cursor-pointer h-full">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-white flex-1">{asset.title}</h3>
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded capitalize">
                        {asset.type}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                      {asset.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="capitalize">{asset.genre}</span>
                      <div className="flex gap-1">
                        {asset.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="bg-slate-600 px-2 py-0.5 rounded">
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
          <div className="text-center py-12">
            <p className="text-slate-400">No assets found. Try adjusting your filters.</p>
          </div>
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
    </div>
  )
}
