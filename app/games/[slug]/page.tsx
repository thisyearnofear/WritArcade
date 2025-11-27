import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GamePlayInterface } from '@/domains/games/components/game-play-interface'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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
    <div className="min-h-screen flex flex-col bg-black">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section with Image */}
        <section className="relative">
          {game.imageUrl && (
            <div className="absolute inset-0 h-96 overflow-hidden">
              <img 
                src={game.imageUrl} 
                alt={game.title}
                className="w-full h-full object-cover opacity-30 blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black"></div>
            </div>
          )}
          
          <div className="relative max-w-6xl mx-auto px-4 py-12">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Game Image */}
              {game.imageUrl && (
                <div className="w-full lg:w-96 flex-shrink-0">
                  <img 
                    src={game.imageUrl} 
                    alt={game.title}
                    className="w-full rounded-lg shadow-2xl border-2"
                    style={{ borderColor: game.primaryColor || '#8b5cf6' }}
                  />
                </div>
              )}
              
              {/* Game Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span 
                    className="px-3 py-1 text-sm rounded-full border font-semibold"
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
                
                <h1 
                  className="text-5xl font-bold"
                  style={{ color: game.primaryColor || '#8b5cf6' }}
                >
                  {game.title}
                </h1>
                
                <blockquote 
                  className="text-2xl italic border-l-4 pl-4"
                  style={{ 
                    borderColor: game.primaryColor || '#8b5cf6',
                    color: game.primaryColor || '#8b5cf6',
                    opacity: 0.9
                  }}
                >
                  "{game.tagline}"
                </blockquote>
                
                <p className="text-gray-300 text-lg leading-relaxed">
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
        <section className="py-8 px-4 bg-black">
          <div className="max-w-6xl mx-auto">
            <GamePlayInterface game={game} />
          </div>
        </section>
      </main>
      
      <Footer />
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