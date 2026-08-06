import Link from 'next/link'
import { Gamepad2, Home, Sparkles, MapPinOff } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'

export default function NotFound() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="mx-auto max-w-lg text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
              <MapPinOff className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400">404</p>
              <h1 className="text-2xl font-bold text-foreground">This story isn&apos;t here</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The page or game may have moved, or the link might be mistyped. The arcade is full of
                playable stories — pick one and jump in.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/games"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-500 sm:w-auto"
              >
                <Gamepad2 className="h-5 w-5" />
                Browse the arcade
              </Link>
              <Link
                href="/generate"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
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
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
