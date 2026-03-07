'use client'

import dynamic from 'next/dynamic'

const GameGrid = dynamic(
  () => import('@/domains/games/components/game-grid').then((mod) => mod.GameGrid),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    ),
  }
)

interface GameGridClientProps {
  writerCoinId: string
  limit?: number
}

export function GameGridClient({ writerCoinId, limit }: GameGridClientProps) {
  return <GameGrid writerCoinId={writerCoinId} limit={limit} />
}
