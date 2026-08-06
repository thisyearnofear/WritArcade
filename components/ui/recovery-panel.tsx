import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { RefreshCw } from 'lucide-react'
import { ArcadeFunnelCTAs } from '@/components/daily-challenge/arcade-funnel-ctas'

interface RecoveryPanelProps {
  icon?: LucideIcon
  title: string
  description: string
  primaryHref?: string
  primaryLabel?: string
  showFunnel?: boolean
  onRetry?: () => void
  retryLabel?: string
  layout?: 'row' | 'stack'
  children?: ReactNode
  className?: string
}

export function RecoveryPanel({
  icon: Icon,
  title,
  description,
  primaryHref,
  primaryLabel,
  showFunnel = true,
  onRetry,
  retryLabel = 'Try again',
  layout = 'stack',
  children,
  className = '',
}: RecoveryPanelProps) {
  return (
    <div className={`mx-auto max-w-lg px-4 py-16 text-center space-y-6 ${className}`}>
      {Icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
          <Icon className="h-7 w-7" />
        </div>
      )}

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {children}

      {showFunnel && (
        <ArcadeFunnelCTAs
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
          layout={layout}
        />
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs text-purple-400 transition-colors hover:text-purple-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}
