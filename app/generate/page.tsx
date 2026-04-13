'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { GameGeneratorForm as GameGenerator } from '@/domains/games/components/game-generator-form'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'

export default function GeneratePage() {
  const searchParams = useSearchParams()
  const urlParam = searchParams.get('url')

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="font-serif text-4xl font-bold text-center mb-2 text-foreground">
              Generate Your Game
            </h1>
            <p className="text-center text-muted-foreground mb-8 text-sm">
              Paste a Paragraph.xyz article URL, choose your genre, and pay with Writer Coins to create.
            </p>
            <ErrorBoundary>
              <GameGenerator initialUrl={urlParam || undefined} />
            </ErrorBoundary>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
