'use client'

import { GameGeneratorForm as GameGenerator } from '@/domains/games/components/game-generator-form'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

export default function GeneratePage() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="font-serif text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
              Generate Your Game
            </h1>
            <p className="text-center text-gray-400 mb-8 text-sm">
              Paste a Paragraph.xyz article URL, choose your genre, and pay with Writer Coins to create.
            </p>
            <ErrorBoundary>
              <GameGenerator />
            </ErrorBoundary>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
