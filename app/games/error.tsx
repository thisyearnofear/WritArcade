'use client'

import { useEffect } from 'react'
import { ErrorCard } from '@/components/error/ErrorCard'

export default function GamesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Games page error:', error)
  }, [error])

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <ErrorCard
          error={error}
          context="Couldn't load games list"
          onRetry={reset}
          suggestions={['Refresh the page to try again.', 'Check your internet connection.']}
        />
      </main>
    </div>
  )
}
