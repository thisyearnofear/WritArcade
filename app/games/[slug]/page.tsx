import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GamePlayInterface } from '@/domains/games/components/game-play-interface'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

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
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Game Header */}
        <section className="py-8 px-4 border-b border-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span 
                    className="px-3 py-1 text-sm rounded-full border"
                    style={{
                      borderColor: game.primaryColor || '#8b5cf6',
                      color: game.primaryColor || '#8b5cf6',
                      backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
                    }}
                  >
                    {game.genre} • {game.subgenre}
                  </span>
                  {game.private && (
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                      Private
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl font-bold mb-3">{game.title}</h1>
                
                <blockquote className="text-xl italic text-purple-300 mb-4 border-l-4 border-purple-600 pl-4">
                  "{game.tagline}"
                </blockquote>
                
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  {game.description}
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>Generated with {game.promptModel}</span>
                  <span>•</span>
                  <span>Created {new Date(game.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Game Play Interface */}
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <GamePlayInterface game={game} />
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}

export async function generateMetadata({ params }: GamePageProps) {
  // Skip database query during build
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
    },
  }
}