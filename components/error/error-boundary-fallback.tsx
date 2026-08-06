'use client'

import { AlertTriangle } from 'lucide-react'
import { RecoveryPanel } from '@/components/ui/recovery-panel'

interface ErrorBoundaryFallbackProps {
  onRetry: () => void
  onReload: () => void
}

export function ErrorBoundaryFallback({ onRetry, onReload }: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <RecoveryPanel
        icon={AlertTriangle}
        title="Something went wrong"
        description="This page hit an unexpected error. Try again, or jump into the arcade and play a public story while things settle."
        onRetry={onReload}
        retryLabel="Reload page"
      >
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-muted-foreground hover:text-purple-400 transition-colors"
        >
          Try recovering without reload
        </button>
      </RecoveryPanel>
    </div>
  )
}
