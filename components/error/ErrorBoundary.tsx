'use client'

import { Component, ReactNode } from 'react'
import { ErrorBoundaryFallback } from '@/components/error/error-boundary-fallback'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Global error boundary that catches React errors and provides recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorBoundaryFallback
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Hook to access error boundary state for manual error reporting
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = (err: Error | string) => {
    const error = err instanceof Error ? err : new Error(err)
    console.error('[ErrorHandler]', error)
    setError(error)
  }

  const clearError = () => setError(null)

  return { error, handleError, clearError }
}

import * as React from 'react'
