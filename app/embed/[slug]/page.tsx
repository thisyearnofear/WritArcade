import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { EmbedGamePlayer } from '@/domains/games/components/embed-game-player'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

// ISR: embed pages are read-only and CDN-cacheable. `?ref=` is read
// client-side so it never forces dynamic rendering.
export const revalidate = 300

interface EmbedPageProps {
  params: Promise<{ slug: string }>
}

export default async function EmbedGamePage({ params }: EmbedPageProps) {
  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game || game.mode === 'wordle' || game.approvalStatus === 'rejected') {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1">
        <ErrorBoundary>
          <EmbedGamePlayer game={game} />
        </ErrorBoundary>
      </div>
      {/* Distribution loop: every embed carries the backlink */}
      <footer className="border-t border-white/10 bg-black px-4 py-2 text-center">
        <a
          href={`/?utm_source=embed&utm_campaign=${encodeURIComponent(game.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Made with <span className="font-semibold">WritersArcade</span>
        </a>
      </footer>
    </div>
  )
}

export async function generateMetadata({ params }: EmbedPageProps) {
  if (!process.env.DATABASE_URL) {
    return { title: 'writersarcade' }
  }

  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game) {
    return { title: 'Game Not Found' }
  }

  return {
    title: `${game.title} — writersarcade`,
    description: game.description,
  }
}
