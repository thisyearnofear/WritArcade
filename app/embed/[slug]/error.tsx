'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, WifiOff } from 'lucide-react'
import { RecoveryPanel } from '@/components/ui/recovery-panel'

export default function EmbedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ slug?: string }>()
  const slug = params?.slug
  const gameHref = slug ? `/games/${slug}?play=1` : '/games'

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6">
      <RecoveryPanel
        icon={WifiOff}
        title="This embed couldn't load"
        description={
          error.digest
            ? 'The story player failed to start. Open the full game on WritersArcade or browse other public stories.'
            : 'The embedded story hit a snag. Try again, open the full experience, or explore the arcade.'
        }
        primaryHref="/games"
        primaryLabel="Browse the arcade"
        onRetry={reset}
        className="text-white [&_h1]:text-white [&_p]:text-muted-foreground"
      >
        {slug && (
          <Link
            href={gameHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-400 hover:text-purple-300"
          >
            <ExternalLink className="h-4 w-4" />
            Open full game
          </Link>
        )}
      </RecoveryPanel>
    </div>
  )
}
