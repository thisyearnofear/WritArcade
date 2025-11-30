'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AssetDatabaseService } from '@/domains/assets/services/asset-database.service'
import type { Asset } from '@/domains/assets/services/asset-database.service'

const GENRES = ['Horror', 'Comedy', 'Mystery', 'Sci-Fi', 'Fantasy', 'Adventure']
const ASSET_TYPES = ['character', 'mechanic', 'plot', 'world', 'dialog']

export default function CreateGamePage() {
  const router = useRouter()
  
  const [step, setStep] = useState<'select' | 'customize' | 'confirm'>('select')
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null)
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string | null>(null)
  
  // Customization state
  const [gameTitle, setGameTitle] = useState('')
  const [gameDescription, setGameDescription] = useState('')
  const [gameGenre, setGameGenre] = useState('')
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAssets()
  }, [searchTerm, selectedTypeFilter, selectedGenreFilter])

  const loadAssets = async () => {
    setLoading(true)
    try {
      let result
      
      if (searchTerm) {
        result = await AssetDatabaseService.getAssets({
          search: searchTerm,
          limit: 50,
        })
      } else if (selectedTypeFilter) {
        result = await AssetDatabaseService.getAssetsByType(selectedTypeFilter, 50)
      } else if (selectedGenreFilter) {
        result = await AssetDatabaseService.getAssetsByGenre(selectedGenreFilter.toLowerCase(), 50)
      } else {
        result = await AssetDatabaseService.getAssets({ limit: 50 })
      }
      
      setAvailableAssets(result.assets || [])
    } catch (err) {
      console.error('Failed to load assets:', err)
      setAvailableAssets([])
    } finally {
      setLoading(false)
    }
  }

  const toggleAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets)
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId)
    } else {
      newSelected.add(assetId)
    }
    setSelectedAssets(newSelected)
  }

  const handleSelectStep = () => {
    if (selectedAssets.size === 0) {
      setError('Please select at least one asset')
      return
    }
    setError(null)
    setStep('customize')
  }

  const handleCustomizeStep = () => {
    if (!gameTitle.trim()) {
      setError('Please enter a game title')
      return
    }
    if (!gameGenre) {
      setError('Please select a genre')
      return
    }
    setError(null)
    setStep('confirm')
  }

  const handleCreateGame = async () => {
    if (selectedAssets.size === 0) {
      setError('No assets selected')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/assets/build-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: Array.from(selectedAssets),
          customization: {
            title: gameTitle,
            description: gameDescription,
            genre: gameGenre.toLowerCase(),
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create game')
      }

      const result = await response.json()
      
      // Redirect to new game
      router.push(`/games/${result.game.slug}`)
    } catch (err) {
      console.error('Game creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create game')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link href="/assets" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
            ← Back to Assets
          </Link>
          <h1 className="text-4xl font-bold text-white mb-4">Build Game from Assets</h1>
          <p className="text-slate-300">
            Combine reusable game components to create a unique game experience
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-12">
          <div className={`flex items-center ${step === 'select' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
              step === 'select' || ['customize', 'confirm'].includes(step) ? 'bg-blue-600' : 'bg-slate-600'
            }`}>
              1
            </div>
            <span className="ml-2 text-white">Select Assets</span>
          </div>
          <div className="flex-1 h-1 mx-4 bg-slate-600" />
          <div className={`flex items-center ${step === 'customize' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
              ['customize', 'confirm'].includes(step) ? 'bg-blue-600' : 'bg-slate-600'
            }`}>
              2
            </div>
            <span className="ml-2 text-white">Customize</span>
          </div>
          <div className="flex-1 h-1 mx-4 bg-slate-600" />
          <div className={`flex items-center ${step === 'confirm' ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
              step === 'confirm' ? 'bg-blue-600' : 'bg-slate-600'
            }`}>
              3
            </div>
            <span className="ml-2 text-white">Confirm</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Step 1: Select Assets */}
        {step === 'select' && (
          <div>
            {/* Filters */}
            <div className="mb-8 space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-2">Type</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTypeFilter(null)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedTypeFilter === null ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      All
                    </button>
                    {ASSET_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedTypeFilter(type)}
                        className={`px-3 py-1 rounded text-sm capitalize ${
                          selectedTypeFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-2">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGenreFilter(null)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedGenreFilter === null ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      All
                    </button>
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setSelectedGenreFilter(genre)}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedGenreFilter === genre ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Grid */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">
                Available Assets ({selectedAssets.size} selected)
              </h2>
              {loading ? (
                <div className="text-center py-12 text-slate-300">Loading assets...</div>
              ) : availableAssets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {availableAssets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => toggleAsset(asset.id)}
                      className={`p-4 rounded-lg cursor-pointer transition border-2 ${
                        selectedAssets.has(asset.id)
                          ? 'border-blue-600 bg-blue-900/30'
                          : 'border-slate-600 bg-slate-700 hover:border-blue-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-white">{asset.title}</h3>
                          <p className="text-sm text-slate-300 mt-1">{asset.description}</p>
                        </div>
                        <div className={`ml-4 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedAssets.has(asset.id)
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-500'
                        }`}>
                          {selectedAssets.has(asset.id) && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs bg-slate-600 text-slate-200 px-2 py-0.5 rounded capitalize">
                          {asset.type}
                        </span>
                        <span className="text-xs text-slate-400">{asset.genre}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-300">No assets found</div>
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={handleSelectStep}
              disabled={selectedAssets.size === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next: Customize Game ({selectedAssets.size} assets)
            </button>
          </div>
        )}

        {/* Step 2: Customize */}
        {step === 'customize' && (
          <div>
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Game Title</label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="Enter game title..."
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Genre</label>
                <select
                  value={gameGenre}
                  onChange={(e) => setGameGenre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a genre...</option>
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre.toLowerCase()}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">Description (Optional)</label>
                <textarea
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  placeholder="Describe your game..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep('select')}
                className="flex-1 px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition"
              >
                Back
              </button>
              <button
                onClick={handleCustomizeStep}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <div>
            <div className="bg-slate-700 rounded-lg p-8 mb-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Game Title</p>
                  <p className="text-2xl font-bold text-white">{gameTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Genre</p>
                  <p className="text-lg text-white capitalize">{gameGenre}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Selected Assets</p>
                  <p className="text-lg text-white">{selectedAssets.size} assets</p>
                </div>
                {gameDescription && (
                  <div>
                    <p className="text-sm text-slate-400">Description</p>
                    <p className="text-white">{gameDescription}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('customize')}
                className="flex-1 px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition"
              >
                Back
              </button>
              <button
                onClick={handleCreateGame}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
