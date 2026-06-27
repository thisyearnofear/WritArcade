'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Activity } from 'lucide-react'

interface PlayTrendChartProps {
  slug: string
}

export function PlayTrendChart({ slug }: PlayTrendChartProps) {
  const [trends, setTrends] = useState<{ date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const response = await fetch(`/api/games/trends?slug=${encodeURIComponent(slug)}`)
        const result = await response.json()
        if (result.success) {
          setTrends(result.data)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchTrends()
  }, [slug])

  if (loading) {
    return (
      <div className="animate-pulse h-24 rounded-lg bg-muted/50" />
    )
  }

  if (trends.length === 0) {
    return null
  }

  // Show last 7 days
  const last7 = trends.slice(-7)
  const maxCount = Math.max(...last7.map(t => t.count), 1)

  const totalLast7 = last7.reduce((sum, t) => sum + t.count, 0)

  // Day labels
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Activity className="w-4 h-4 text-purple-400" />
          Play activity (7 days)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className={`w-3.5 h-3.5 ${totalLast7 > 0 ? 'text-emerald-400' : ''}`} />
          <span>{totalLast7} total</span>
        </div>
      </div>

      <div className="flex items-end gap-1 h-16">
        {last7.map((day, i) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
          const d = new Date(day.date)
          const dayName = dayLabels[d.getDay()]
          const isToday = i === last7.length - 1

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex justify-center">
                {day.count > 0 && (
                  <span className="absolute -top-4 text-[10px] text-muted-foreground font-mono">
                    {day.count}
                  </span>
                )}
              </div>
              <div
                className={`w-full rounded-sm transition-all duration-500 ${
                  isToday
                    ? 'bg-purple-500/80'
                    : day.count > 0
                    ? 'bg-purple-500/40 hover:bg-purple-500/60'
                    : 'bg-muted/30'
                }`}
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${day.date}: ${day.count} plays`}
              />
              <span className={`text-[10px] ${isToday ? 'text-purple-400 font-medium' : 'text-muted-foreground'}`}>
                {dayName}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
