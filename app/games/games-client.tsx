'use client'

import { useState } from 'react'
import { GameGrid } from '@/domains/games/components/game-grid'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Search, Filter, BookOpen, Compass, Zap, Brain, Sword, Store, ChevronLeft, ChevronRight, X, BarChart3, Clock } from 'lucide-react'
import { GenreFilterList } from '@/domains/games/components/genre-filter-list'
import type { GenreOption } from '@/domains/games/components/genre-filter-list'
import { DailyChallengeBanner } from '@/components/daily-challenge/daily-challenge-banner'
import { WRITER_COINS } from '@/lib/writerCoins'
import Link from 'next/link'

const genres: GenreOption[] = [
  { id: 'all', label: 'All', icon: BookOpen },
  { id: 'Simulation', label: 'Simulation', icon: Store },
  { id: 'Adventure', label: 'Adventure', icon: Compass },
  { id: 'Action', label: 'Action', icon: Sword },
  { id: 'Strategy', label: 'Strategy', icon: Zap },
  { id: 'Puzzle', label: 'Puzzle', icon: Brain },
]

export function GamesClient() {
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalGames, setTotalGames] = useState(0)
  const [itemsPerPage] = useState(12)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'playCount'>('recent')

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStatsLoad = (data: { total: number, count: number }) => {
    setTotalGames(data.total)
  }

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          <div className="px-4 py-8 border-b border-border sm:py-10">
            <div className="max-w-7xl mx-auto">
              <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-2">
                The Arcade
              </h1>
              <p className="text-muted-foreground max-w-2xl mb-6">
                Interactive games generated from articles by supported writers. Play, collect, and own the experience.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-1">
                  Writers
                </span>
                {WRITER_COINS.map((coin) => (
                  <Link
                    key={coin.id}
                    href={`/writers/${coin.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:border-purple-500 hover:bg-purple-500/5 text-xs text-foreground transition-colors"
                    title={`${coin.writer} — ${WRITER_COINS.length} whitelisted writer coins`}
                  >
                    <span className="font-mono font-semibold">${coin.symbol.replace('$', '')}</span>
                    <span className="text-muted-foreground hidden sm:inline">{coin.writer}</span>
                  </Link>
                ))}
                <span className="text-[10px] text-muted-foreground ml-1">
                  {WRITER_COINS.length} whitelisted
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 pb-4">
            <DailyChallengeBanner compact />
          </div>

          <div className="lg:hidden px-4 pt-4 pb-2 flex flex-col gap-2 min-[420px]:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500 transition-colors placeholder-muted-foreground"
              />
            </div>
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="flex min-h-10 items-center justify-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground hover:border-purple-500 transition-colors min-[420px]:justify-start"
              aria-label="Open genre filters"
            >
              <Filter className="w-4 h-4" />
              {selectedGenre ?? 'Genres'}
            </button>
          </div>

          {filterDrawerOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                onClick={() => setFilterDrawerOpen(false)}
                aria-hidden="true"
              />
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-border rounded-t-lg p-5 lg:hidden animate-slide-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filters
                  </h3>
                  <button
                    onClick={() => setFilterDrawerOpen(false)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" /> Sort
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSortBy('recent'); setCurrentPage(1); setFilterDrawerOpen(false) }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        sortBy === 'recent'
                          ? 'bg-card text-foreground border-purple-500 shadow-sm'
                          : 'bg-muted text-muted-foreground border-border hover:border-purple-500'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Newest
                    </button>
                    <button
                      onClick={() => { setSortBy('playCount'); setCurrentPage(1); setFilterDrawerOpen(false) }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        sortBy === 'playCount'
                          ? 'bg-card text-foreground border-purple-500 shadow-sm'
                          : 'bg-muted text-muted-foreground border-border hover:border-purple-500'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Most played
                    </button>
                  </div>
                </div>

                <div className="mb-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5" /> Genres
                  </h4>
                  <GenreFilterList
                    genres={genres}
                    selected={selectedGenre}
                    onSelect={(id) => { setSelectedGenre(id); setCurrentPage(1); setFilterDrawerOpen(false) }}
                    variant="drawer"
                  />
                </div>
              </div>
            </>
          )}

          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <aside className="hidden lg:block lg:w-64 flex-shrink-0 space-y-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500 transition-colors placeholder-muted-foreground"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Genres
                  </h3>
                  <GenreFilterList
                    genres={genres}
                    selected={selectedGenre}
                    onSelect={(id) => { setSelectedGenre(id); setCurrentPage(1) }}
                    variant="sidebar"
                  />
                </div>
              </aside>

              <div className="flex-1">
                <div className="flex items-center justify-end mb-4">
                  <div className="inline-flex items-center rounded-lg border border-border bg-muted p-0.5">
                    <button
                      onClick={() => { setSortBy('recent'); setCurrentPage(1) }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        sortBy === 'recent'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Newest
                    </button>
                    <button
                      onClick={() => { setSortBy('playCount'); setCurrentPage(1) }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        sortBy === 'playCount'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Most played
                    </button>
                  </div>
                </div>
                <GameGrid
                  key={`${selectedGenre}-${searchQuery}-${currentPage}-${sortBy}`}
                  limit={itemsPerPage}
                  page={currentPage}
                  genre={selectedGenre}
                  search={searchQuery}
                  sortBy={sortBy}
                  onLoad={handleStatsLoad}
                  emptyActionLabel="Create a game"
                />

                {totalGames > 0 && (
                  <div className="mt-8 flex justify-center items-center gap-4 border-t border-border pt-8">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-border text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-muted-foreground text-sm">
                      Page <span className="text-foreground font-medium">{currentPage}</span>
                      {' '}of{' '}
                      <span className="text-foreground font-medium">{Math.ceil(totalGames / itemsPerPage) || 1}</span>
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalGames / itemsPerPage)}
                      className="p-2 rounded-lg border border-border text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
