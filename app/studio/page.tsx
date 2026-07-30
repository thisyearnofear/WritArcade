'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const GENRES = [
  { id: 'mystery', label: 'Mystery', hint: 'Intrigue-led' },
  { id: 'comedy', label: 'Comedy', hint: 'Light, playful' },
  { id: 'horror', label: 'Horror', hint: 'High tension' },
] as const

type Genre = (typeof GENRES)[number]['id']

const MAX_COPY_CHARS = 20_000

export default function StudioPage() {
  const router = useRouter()
  const [copy, setCopy] = useState('')
  const [genre, setGenre] = useState<Genre>('mystery')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsCredits, setNeedsCredits] = useState(false)

  const charCount = copy.length
  const canSubmit = copy.trim().length >= 50 && charCount <= MAX_COPY_CHARS && !isGenerating

  const handleGenerate = async () => {
    if (!canSubmit) return
    setIsGenerating(true)
    setError(null)
    setNeedsCredits(false)

    try {
      // Mint a guest session lazily; idempotent for returning visitors.
      await fetch('/api/session/guest', { method: 'POST' }).catch(() => {})

      const response = await fetch('/api/games/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: copy.trim(),
          contentType: 'marketing-copy',
          mode: 'story',
          customization: { genre },
        }),
      })
      const data = await response.json()

      if (response.status === 402) {
        setNeedsCredits(true)
        return
      }
      if (!data.success) {
        throw new Error(data.error || 'Generation failed. Please try again.')
      }

      router.push(`/games/${data.data.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main id="main-content" className="flex-1 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto px-4">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              No crypto. Just plays.
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-center mb-2 text-foreground">
              Turn your copy into a playable story
            </h1>
            <p className="text-center text-muted-foreground mb-8 text-sm max-w-md mx-auto">
              Paste your marketing copy. AI turns it into an interactive narrative
              and shows you which framings your readers actually choose.
            </p>

            <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5">
              <div>
                <label htmlFor="studio-copy" className="block text-sm font-semibold text-foreground mb-2">
                  Your copy
                </label>
                <textarea
                  id="studio-copy"
                  value={copy}
                  onChange={(e) => setCopy(e.target.value)}
                  maxLength={MAX_COPY_CHARS}
                  rows={10}
                  placeholder="Paste your landing page, email, or campaign copy here… (50+ characters)"
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">
                  {charCount.toLocaleString()} / {MAX_COPY_CHARS.toLocaleString()}
                </div>
              </div>

              <div>
                <span className="block text-sm font-semibold text-foreground mb-2">Tone</span>
                <div className="grid grid-cols-3 gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGenre(g.id)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition',
                        genre === g.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted/50 hover:border-muted-foreground/30'
                      )}
                    >
                      <div className="text-sm font-semibold text-foreground">{g.label}</div>
                      <div className="text-xs text-muted-foreground">{g.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              {needsCredits && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <p className="font-semibold text-foreground mb-1">Your free story is used up</p>
                  <p className="text-muted-foreground">
                    Buy credits to keep creating — 10 credits ($1) per story.{' '}
                    <Link href="/my-games" className="text-primary underline underline-offset-2">
                      Get credits
                    </Link>
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!canSubmit}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Crafting your story…</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Generate free story</>
                )}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                First story is free. No wallet, no signup.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
