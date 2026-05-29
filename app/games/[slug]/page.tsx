import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GamePlayInterface } from '@/domains/games/components/game-play-interface'
import { WordleGameInterface } from '@/domains/games/components/wordle-game-interface'
import { ImageGenerationService } from '@/domains/games/services/image-generation.service'
import { WordleService } from '@/domains/games/services/wordle.service'
import { IPAttribution } from '@/domains/games/components/ip-attribution'
import { ProtocolLifecycle } from '@/domains/games/components/protocol-lifecycle'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

// ISR: revalidate game pages every 5 minutes from CDN — eliminates per-request DB hits
// for read-only story game pages. Wordle answer is stable so this is safe.
export const revalidate = 300

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

  // For story games, generate image if not exists (async, non-blocking)
  if (game.mode !== 'wordle' && !game.imageUrl) {
    ImageGenerationService.generateGameImage(game).then(result => {
      if (result.imageUrl) {
        GameDatabaseService.updateGameImage(game.id, result.imageUrl).catch(console.error)
      }
    }).catch(console.error)
  }

  // Wordle-mode games render a Wordle interface instead of the comic-story interface
  // The answer is NEVER stored in plaintext — read from CDR vault on the client
  if (game.mode === 'wordle') {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <ProtocolLifecycle game={game} />
        </div>
        <WordleGameInterface game={game} maxAttempts={WordleService.DEFAULT_MAX_ATTEMPTS} />
      </div>
    )
  }

  // Extract and flatten assets for the attribution component
   
  type LinkedAsset = { id: string; title: string; type: string; storyRegistration?: { storyIpId: string; status: string } | null }
  const gameWithAssets = game as typeof game & { gamesFromAssets?: { asset: LinkedAsset }[] }
  const linkedAssets = gameWithAssets.gamesFromAssets?.map((relation) => relation.asset) || []

  return (
    <div className="min-h-screen bg-black">
      {linkedAssets.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <IPAttribution assets={linkedAssets} compact />
        </div>
      )}
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <ProtocolLifecycle game={game} />
      </div>
      <ErrorBoundary>
        <GamePlayInterface game={game} />
      </ErrorBoundary>

    </div>
  )
}

export async function generateMetadata({ params }: GamePageProps) {
  if (!process.env.DATABASE_URL) {
    return {
      title: 'writersarcade Game',
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
    title: `${game.title} - writersarcade`,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
      type: 'article',
      images: game.imageUrl ? [game.imageUrl] : [],
    },
  }
}
