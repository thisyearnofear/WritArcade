'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, TrendingUp, DollarSign, Gamepad2, Activity, Shield } from 'lucide-react'
import { MUSD_CONFIG } from '@/lib/writer-coins'

interface MezoAnalyticsData {
  totalGames: number
  totalVolumeMUSD: string
  totalPlatformFees: string
  totalCreatorPayouts: string
  boostedCount: number
  nonBoostedCount: number
  recentActivity: Array<{
    txHash: string
    gameTitle: string
    genre: string
    creator: string
    creatorFee: string
    platformFee: string
    boosted: boolean
    timestamp: number
    blockNumber: number
  }>
  lastUpdated: string
}

function formatMUSD(wei: string): string {
  const val = Number(wei) / 1e18
  return val.toFixed(2)
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <motion.div
      className={`rounded-xl border ${accent} bg-card p-4 space-y-2`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  )
}

export function MezoAnalytics() {
  const [data, setData] = useState<MezoAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/mezo/analytics')
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          setError('Failed to load analytics')
        }
      } catch {
        setError('Failed to connect to analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-3 w-16 bg-muted rounded mb-3" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center text-sm text-muted-foreground">
        <p>Analytics will appear once games have been generated on the MezoBoostedSplitter contract.</p>
      </div>
    )
  }

  const totalVolume = formatMUSD(data.totalVolumeMUSD)
  const _totalPlatform = formatMUSD(data.totalPlatformFees)
  const totalCreator = formatMUSD(data.totalCreatorPayouts)
  const boostedPct = data.totalGames > 0
    ? Math.round((data.boostedCount / data.totalGames) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Gamepad2}
          label="Games Generated"
          value={data.totalGames.toString()}
          accent="border-purple-500/30"
        />
        <StatCard
          icon={DollarSign}
          label="Total Volume"
          value={`${totalVolume} MUSD`}
          accent="border-amber-500/30"
        />
        <StatCard
          icon={TrendingUp}
          label="Creator Payouts"
          value={`${totalCreator} MUSD`}
          accent="border-green-500/30"
        />
        <StatCard
          icon={Shield}
          label="MEZO Boosted"
          value={`${data.boostedCount}`}
          sub={data.totalGames > 0 ? `${boostedPct}% of all games` : undefined}
          accent="border-cyan-500/30"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="block font-medium text-foreground">{formatMUSD(data.totalPlatformFees)} MUSD</span>
          <span>Platform treasury</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="block font-medium text-foreground">{data.nonBoostedCount}</span>
          <span>Standard (no boost)</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="block font-medium text-foreground">{data.boostedCount}</span>
          <span>MEZO holder boost</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <span className="block font-medium text-foreground">{boostedPct}%</span>
          <span>Boost adoption rate</span>
        </div>
      </div>

      {data.recentActivity.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recent Activity</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Last 10,000 blocks
            </span>
          </div>
          <div className="divide-y divide-border">
            {data.recentActivity.slice(0, 10).map((event) => (
              <div key={event.txHash} className="px-4 py-3 flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.boosted ? 'bg-cyan-400' : 'bg-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {event.gameTitle}
                    </span>
                    {event.boosted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                        Boosted
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.genre} · by {shortenAddress(event.creator)} · {formatMUSD(event.creatorFee)} MUSD to creator
                  </div>
                </div>
                <a
                  href={`https://explorer.test.mezo.org/tx/${event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground text-right">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        {' · '}Data from{' '}
        <a
          href={`https://explorer.test.mezo.org/address/${MUSD_CONFIG.testnet.paymentSplitter}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          MezoBoostedSplitter
        </a>
        {' · '}Auto-refreshes every 30s
      </div>
    </div>
  )
}
