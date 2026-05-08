'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { GameGeneratorForm as GameGenerator } from '@/domains/games/components/game-generator-form'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import type { PaymentPath } from '@/domains/games/components/simple-game-form'

function paymentPathFromParam(value: string | null): PaymentPath | undefined {
  if (value === 'musd' || value === 'writercoin') {
    return value
  }
  return undefined
}

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const urlParam = searchParams.get('url')
  const payParam = paymentPathFromParam(searchParams.get('pay'))

  return (
    <ErrorBoundary>
      <GameGenerator
        initialUrl={urlParam || undefined}
        initialPaymentPath={payParam}
      />
    </ErrorBoundary>
  )
}

export default function GeneratePage() {
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
              Paste a Paragraph.xyz article URL, choose your genre, and pay with Writer Coins or MUSD to create.
            </p>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            }>
              <GeneratePageContent />
            </Suspense>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
