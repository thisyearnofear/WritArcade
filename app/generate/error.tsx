'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GenerateError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Generate page error:', error)
  }, [error])

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground mb-2">Couldn't load the generator</h2>
          <p className="text-muted-foreground mb-6">
            {error.message || 'Something went wrong. Please try again.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Back home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
