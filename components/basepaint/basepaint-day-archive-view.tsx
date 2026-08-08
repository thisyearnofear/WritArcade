'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gamepad2, Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { DailyChallengeSubnav } from '@/components/daily-challenge/daily-challenge-subnav'
import { BasePaintTrack } from '@/components/basepaint/basepaint-track'
import { BasePaintCanvasMeta, type BasePaintCanvasMetaProps } from '@/components/basepaint/basepaint-canvas-meta'
import { BasePaintStrokeReplay } from '@/components/basepaint/basepaint-stroke-replay'
import { getBasePaintDay } from '@/lib/daily-challenge/daily-challenge-ui'

interface DayArchiveData {
  day: number
  theme: string
  palette: string[]
  canvasDescription?: string
  stats?: BasePaintCanvasMetaProps['stats']
  games: Array<{
    slug: string
    title: string
    imageUrl: string | null
    playCount: number
    score?: number
  }>
  storyCount: number
}

export function BasePaintDayArchiveView({ day }: { day: number }) {
  const [data, setData] = useState<DayArchiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const isToday = day === getBasePaintDay()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/basepaint/day/${day}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false))
  }, [day])

  return (
    <ThemeWrapper theme="arcade">
      <div className="relative flex min-h-screen flex-col">
        <BasePaintTrack />
        <Header />
        <DailyChallengeSubnav />

        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 bg-gradient-to-b from-purple-950/20 via-black to-black px-4 py-10 text-white">
          <Link
            href="/basepaint"
            className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Daily Challenge
          </Link>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : !data ? (
            <p className="text-center text-sm text-muted-foreground">Day {day} not found.</p>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
                  BasePaint Day {data.day}
                </p>
                <h1 className="text-3xl font-bold">{data.theme}</h1>
                <p className="text-sm text-muted-foreground">
                  {data.storyCount} community {data.storyCount === 1 ? 'story' : 'stories'} on writersarcade
                  {data.games.length > 0 ? ' · top runs below' : ' · be the first to play'}
                </p>
              </div>

              <BasePaintCanvasMeta
                day={data.day}
                theme={data.theme}
                palette={data.palette}
                canvasDescription={data.canvasDescription}
                stats={data.stats}
              />

              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  On-chain stroke replay
                </h2>
                <BasePaintStrokeReplay day={data.day} />
              </section>

              {data.games.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Community stories
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.games.map((game) => (
                      <Link
                        key={game.slug}
                        href={`/games/${game.slug}`}
                        className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-purple-500/40"
                      >
                        {game.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={game.imageUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-purple-500/10">
                            <Gamepad2 className="h-6 w-6 text-purple-300/60" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{game.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {game.playCount} plays
                            {game.score != null ? ` · ${game.score} pts` : ''}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {isToday && (
                <Link
                  href="/basepaint"
                  className="block w-full rounded-lg bg-purple-600 py-3 text-center text-sm font-semibold text-white hover:bg-purple-500"
                >
                  Play today&apos;s Daily Challenge
                </Link>
              )}
            </>
          )}
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
