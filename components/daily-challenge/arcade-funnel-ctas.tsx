import Link from 'next/link'
import { ArrowRight, Gamepad2, Sparkles, Home } from 'lucide-react'

interface ArcadeFunnelCTAsProps {
  /** Primary action — defaults to arcade browse */
  primaryHref?: string
  primaryLabel?: string
  /** Show create + home links below primary */
  showSecondary?: boolean
  className?: string
  layout?: 'row' | 'stack'
}

export function ArcadeFunnelCTAs({
  primaryHref = '/games',
  primaryLabel = 'Browse the arcade',
  showSecondary = true,
  className = '',
  layout = 'row',
}: ArcadeFunnelCTAsProps) {
  const stack = layout === 'stack'

  return (
    <div
      className={`flex ${stack ? 'flex-col' : 'flex-col sm:flex-row'} items-center justify-center gap-3 ${className}`}
    >
      <Link
        href={primaryHref}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-500 w-full sm:w-auto"
      >
        <Gamepad2 className="h-5 w-5" />
        {primaryLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>

      {showSecondary && (
        <>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted w-full sm:w-auto"
          >
            <Sparkles className="h-5 w-5" />
            Create a game
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-purple-400"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </>
      )}
    </div>
  )
}
