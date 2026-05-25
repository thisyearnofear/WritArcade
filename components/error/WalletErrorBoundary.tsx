'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches runtime errors in the wallet provider subtree.
 *
 * IMPORTANT: The fallback renders a minimal UI that does NOT import or use
 * wagmi / RainbowKit / Mezo Passport hooks.  If the crash was caused by the
 * wagmi config itself, the fallback must not re-trigger it.
 */
export class WalletErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[WalletErrorBoundary] Wallet provider crashed:', error)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col min-h-screen">
          {/* Simple header without wagmi dependencies */}
          <header className="border-b border-border bg-background/95 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
              <a href="/" className="flex items-center space-x-2">
                <img src="/logo.png" alt="writersarcade" className="h-8 w-auto" />
              </a>
            </div>
          </header>
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Wallet connection unavailable</h2>
              <p className="text-sm text-muted-foreground">
                Your wallet provider could not be initialized. This is usually caused by a browser extension conflict.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </div>
          </main>
          <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
            writersarcade
          </footer>
        </div>
      )
    }

    return this.props.children
  }
}
