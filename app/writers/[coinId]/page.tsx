import { notFound } from 'next/navigation'
import { getWriterCoinById, WRITER_COINS } from '@/lib/writerCoins'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { WriterPageClient } from './writer-page-client'

export const revalidate = 300

interface WriterPageProps {
  params: Promise<{ coinId: string }>
}

export async function generateStaticParams() {
  return WRITER_COINS.map((coin) => ({ coinId: coin.id }))
}

export async function generateMetadata({ params }: WriterPageProps) {
  const { coinId } = await params
  const coin = getWriterCoinById(coinId)
  if (!coin) return { title: 'Writer Not Found' }
  return {
    title: `${coin.writer} — writersarcade`,
    description: coin.bio,
  }
}

export default async function WriterPage({ params }: WriterPageProps) {
  const { coinId } = await params
  const coin = getWriterCoinById(coinId)

  if (!coin) notFound()

  const { total } = await GameDatabaseService.getGames({
    writerCoinId: coinId,
    includePrivate: false,
    requireArtifact: true,
    limit: 1,
  })

  return (
    <WriterPageClient
      coinId={coinId}
      writer={coin.writer}
      bio={coin.bio}
      symbol={coin.symbol}
      paragraphUrl={coin.paragraphUrl}
      address={coin.address}
      total={total}
    />
  )
}
