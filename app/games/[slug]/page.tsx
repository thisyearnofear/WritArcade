import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GamePlayInterface } from '@/domains/games/components/game-play-interface'
import { ImageGenerationService } from '@/domains/games/services/image-generation.service'

export const dynamic = 'force-dynamic'

interface GamePageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)
  
  if (!game) {
    notFound()
  }

  // Generate image if not exists (async, non-blocking)
  if (!game.imageUrl) {
    ImageGenerationService.generateGameImage(game).then(imageUrl => {
      if (imageUrl) {
        GameDatabaseService.updateGameImage(game.id, imageUrl).catch(console.error)
      }
    }).catch(console.error)
  }
  
  return (
    <div className="min-h-screen bg-black">
      <GamePlayInterface game={game} />
    </div>
  )
}

export async function generateMetadata({ params }: GamePageProps) {
  if (!process.env.DATABASE_URL) {
    return {
      title: 'WritArcade Game',
      description: 'Play interactive games generated from articles',
    }
  }

  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)
  
  if (!game) {
    return {
      title: 'Game Not Found',
    }
  }
  
  return {
    title: `${game.title} - WritArcade`,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
      type: 'article',
      images: game.imageUrl ? [game.imageUrl] : [],
    },
  }
}