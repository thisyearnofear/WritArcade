import { AlertCircle, Lightbulb, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatError } from '@/services/error-handler'

interface ErrorCardProps {
  error: unknown
  context?: string
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
  suggestions?: string[]
}

export function ErrorCard({
  error,
  context,
  onRetry,
  onDismiss,
  showDetails = false,
  suggestions,
}: ErrorCardProps) {
  const errorInfo = formatError(error, context)
  const showSuggestions = suggestions && suggestions.length > 0

  return (
    <div className="rounded-lg border border-red-600/50 bg-red-900/20 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-200 mb-1">Error</h3>
          <p className="text-sm text-red-300 break-words">{errorInfo.userMessage}</p>

          {showDetails && errorInfo.details && (
            <p className="text-xs text-red-400 mt-2 opacity-75">{errorInfo.details}</p>
          )}

          {showDetails && showSuggestions && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-red-300 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Try this:
              </p>
              <ul className="text-xs text-red-300 space-y-1 ml-4">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 flex-shrink-0 mt-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="w-full text-red-200 border-red-600 hover:bg-red-900/40"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  )
}
