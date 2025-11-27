import { GameGenerator } from '@/domains/games/components/game-generator'

export default function GeneratePage() {
  return (
    <div className="min-h-screen bg-black py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
          Generate Your Game
        </h1>
        <GameGenerator />
      </div>
    </div>
  )
}
