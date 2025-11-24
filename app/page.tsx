import { Suspense } from 'react'
import { GameGrid } from '@/domains/games/components/game-grid'
import { GameGeneratorForm } from '@/domains/games/components/game-generator-form'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
              WritArcade
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Turn any article into an interactive, mintable game. 
              Pay with newsletter memecoins to create your unique interpretation.
            </p>
            
            {/* Game Generator */}
            <div className="max-w-2xl mx-auto">
              <GameGeneratorForm />
            </div>
          </div>
        </section>
        
        {/* Featured Games */}
        <section className="py-16 px-4 bg-gray-900/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Recently Generated Games
            </h2>
            <Suspense fallback={<div className="text-center">Loading games...</div>}>
              <GameGrid limit={12} />
            </Suspense>
          </div>
        </section>
        
        {/* How it Works */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">How WritArcade Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Submit Content</h3>
                <p className="text-gray-400">
                  Paste an article URL or text from your favorite newsletter or blog
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Customize & Generate</h3>
                <p className="text-gray-400">
                  Choose your style, AI model, and creative parameters. Pay with memecoin.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Play & Mint</h3>
                <p className="text-gray-400">
                  Experience your unique game interpretation and mint it as an NFT
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}