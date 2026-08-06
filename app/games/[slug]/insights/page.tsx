'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Loader2, Lock, WifiOff, Gamepad2 } from 'lucide-react'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { EmbedSnippet } from '@/components/embed/EmbedSnippet'
import { RecoveryPanel } from '@/components/ui/recovery-panel'
import type { GameInsights } from '@/domains/games/services/game-insights.service'

export default function GameInsightsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [insights, setInsights] = useState<GameInsights | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/games/${slug}/insights`)
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (res.status === 401 || res.status === 403) {
          setError('Only the game owner can view insights.')
        } else if (!data.success) {
          setError(data.error || 'Failed to load insights.')
        } else {
          setInsights(data.data)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load insights.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <ThemeWrapper theme="arcade">
      <div className="min-h-screen bg-black">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <Link
            href={`/games/${slug}`}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to game
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-white">Resonance insights</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            How far readers get through your story — and which framings they choose.
          </p>

          {loading && (
            <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading insights...
            </div>
          )}

          {error && !loading && (
            <div className="mt-10">
              <RecoveryPanel
                icon={error.includes('owner') ? Lock : WifiOff}
                title={error.includes('owner') ? 'Owner access only' : "Couldn't load insights"}
                description={
                  error.includes('owner')
                    ? 'Resonance data is private to whoever created this game. Play the story publicly, or open your own library if you manage this game.'
                    : 'Insights did not load this time. Play the game or browse the arcade while you retry.'
                }
                showFunnel={false}
                onRetry={() => window.location.reload()}
                className="py-8"
              >
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href={`/games/${slug}?play=1`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-500 sm:w-auto"
                  >
                    <Gamepad2 className="h-5 w-5" />
                    Play this game
                  </Link>
                  <Link
                    href="/my-games"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
                  >
                    My library
                  </Link>
                  <Link
                    href="/games"
                    className="text-sm font-medium text-purple-400 hover:text-purple-300"
                  >
                    Browse arcade
                  </Link>
                </div>
              </RecoveryPanel>
            </div>
          )}

          {insights && !loading && (
            <div className="mt-8 space-y-8">
              {/* Resonance headline */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Resonance"
                  value={
                    insights.resonance !== null
                      ? `${Math.round(insights.resonance * 100)}%`
                      : '—'
                  }
                  hint={
                    insights.resonance !== null
                      ? 'of starts finish the story'
                      : `needs 5+ starts (${insights.starts} so far)`
                  }
                  highlight
                />
                <StatCard label="Starts" value={String(insights.starts)} hint={`${insights.embeddedStarts} from embeds`} />
                <StatCard label="Completions" value={String(insights.completions)} hint="full 5-panel reads" />
              </div>

              {/* Panel funnel */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Panel funnel
                </h2>
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <FunnelBar label="Started" count={insights.starts} max={Math.max(insights.starts, 1)} />
                  {insights.panelFunnel.map((step) => (
                    <FunnelBar
                      key={step.panelIndex}
                      label={`Panel ${step.panelIndex} choice`}
                      count={step.choices}
                      max={Math.max(insights.starts, 1)}
                    />
                  ))}
                  <FunnelBar label="Completed" count={insights.completions} max={Math.max(insights.starts, 1)} accent />
                </div>
              </section>

              {/* Choice splits */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Which framing readers chose
                </h2>
                <div className="mt-3 space-y-4">
                  {insights.panelFunnel.filter((s) => s.choiceDistribution.length > 0).length === 0 && (
                    <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                      No choices logged yet — share or embed your story to start collecting signal.
                    </p>
                  )}
                  {insights.panelFunnel
                    .filter((step) => step.choiceDistribution.length > 0)
                    .map((step) => (
                      <div key={step.panelIndex} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-3 text-xs font-bold text-white/80">Panel {step.panelIndex}</p>
                        <div className="space-y-2">
                          {step.choiceDistribution.map((choice) => (
                            <div key={choice.choiceIndex}>
                              <div className="mb-1 flex items-baseline justify-between gap-3">
                                <p className="truncate text-xs text-white/70">
                                  {choice.label || `Option ${choice.choiceIndex}`}
                                </p>
                                <p className="shrink-0 text-xs font-semibold text-white">
                                  {step.choices > 0 ? Math.round((choice.count / step.choices) * 100) : 0}%
                                </p>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${step.choices > 0 ? (choice.count / step.choices) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </section>

              {/* Referrers */}
              {insights.referrers.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Where plays come from
                  </h2>
                  <div className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5">
                    {insights.referrers.map((row, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="truncate text-white/70">{row.referrer || 'Direct'}</span>
                        <span className="shrink-0 font-semibold text-white">{row.starts}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Embed snippet — the growth loop */}
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Put it in front of readers
                </h2>
                <EmbedSnippet slug={slug} />
              </section>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </ThemeWrapper>
  )
}

function StatCard({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string
  value: string
  hint: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function FunnelBar({
  label,
  count,
  max,
  accent = false,
}: {
  label: string
  count: number
  max: number
  accent?: boolean
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs text-white/70">{label}</p>
        <p className="text-xs font-semibold text-white">{count}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${accent ? 'bg-emerald-400' : 'bg-primary'}`}
          style={{ width: `${Math.min((count / max) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}
