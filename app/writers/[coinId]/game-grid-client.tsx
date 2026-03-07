'use client'

import { GameGrid } from '@/domains/games/components/game-grid'

interface GameGridClientProps {
  writerCoinId: string
  limit?: number
}

export function GameGridClient({ writerCoinId, limit }: GameGridClientProps) {
  return <GameGrid writerCoinId={writerCoinId} limit={limit} />
}
