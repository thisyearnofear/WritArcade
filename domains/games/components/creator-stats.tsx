'use client'

import { motion } from 'framer-motion'
import { Clapperboard, Eye, Trophy, Sparkles } from 'lucide-react'

export interface CreatorStatsProps {
  gameTitle: string
  genre: string
  totalPanels: number
  hasAnimation: boolean
  viewCount?: number
  playCount?: number
  shareCount?: number
  milestones?: string[]
  isLoading?: boolean
}

export function CreatorStats({
  gameTitle,
  genre,
  totalPanels,
  hasAnimation,
  viewCount = 0,
  playCount = 0,
  shareCount = 0,
  milestones = [],
  isLoading = false,
}: CreatorStatsProps) {
  const stats = [
    { label: 'Views', value: viewCount, icon: Eye, tracked: false },
    { label: 'Plays', value: playCount, icon: Trophy, tracked: true },
    { label: 'Shares', value: shareCount, icon: Sparkles, tracked: false },
  ]

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-black/80 p-5 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🎉</span>
        <h3 className="text-base font-bold text-white">Creator Milestones</h3>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Your <span className="font-semibold text-foreground">{gameTitle}</span> {genre.toLowerCase()} comic
        with {totalPanels} panels is inspiring others.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-center transition-colors hover:bg-white/10"
            title={stat.tracked ? undefined : 'Coming soon'}
          >
            <stat.icon className="mx-auto mb-1 h-4 w-4 text-purple-400" />
            {isLoading ? (
              <div className="mx-auto my-1 h-6 w-10 animate-pulse rounded-md bg-white/10" />
            ) : (
              <div className={`text-xl font-bold ${stat.tracked ? 'text-white' : 'text-muted-foreground'}`}>
                {stat.tracked ? stat.value : '—'}
              </div>
            )}
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {hasAnimation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2"
        >
          <Clapperboard className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-200">
            Animated — your comic now moves
          </span>
        </motion.div>
      )}

      {milestones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent milestones</p>
          <div className="flex flex-wrap gap-2">
            {milestones.map((milestone, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-200"
              >
                ✨ {milestone}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
