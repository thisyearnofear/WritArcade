'use client'

import { useEffect } from 'react'
import { ErrorCard } from '@/components/error/ErrorCard'

export default function WriterError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Writer page error:', error)
  }, [error])

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <ErrorCard
          error={error}
          context="Couldn't load writer"
          onRetry={reset}
          suggestions={['Refresh the page to try again.', 'This writer may not have any public games yet.']}
        />
      </main>
    </div>
  )
}
