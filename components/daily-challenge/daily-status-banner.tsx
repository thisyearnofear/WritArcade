import { Clock, Sparkles, WifiOff } from 'lucide-react'

export type DailyStatusVariant = 'deck-warming' | 'offline' | 'play-error'

const COPY: Record<
  DailyStatusVariant,
  { icon: typeof Clock; title: string; body: string }
> = {
  'deck-warming': {
    icon: Clock,
    title: 'Leaderboard is warming up',
    body: 'Today\'s encrypted modifier deck is still setting up on-chain. You can play right now in the arcade while we finish — same great stories, no wallet required.',
  },
  offline: {
    icon: WifiOff,
    title: 'Daily leaderboard is in preview',
    body: 'Scores aren\'t live yet, but today\'s theme is ready to explore. Browse the arcade or create your own game from an article.',
  },
  'play-error': {
    icon: Sparkles,
    title: 'Couldn\'t start today\'s session',
    body: 'Something blocked the on-chain deal. Jump into the arcade or create a game — you don\'t need a wallet to play public games.',
  },
}

interface DailyStatusBannerProps {
  variant: DailyStatusVariant
  className?: string
}

export function DailyStatusBanner({ variant, className = '' }: DailyStatusBannerProps) {
  const { icon: Icon, title, body } = COPY[variant]

  return (
    <div
      className={`rounded-xl border border-amber-500/25 bg-amber-950/20 px-5 py-4 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3 text-left">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-100">{title}</p>
          <p className="text-xs leading-relaxed text-amber-100/75">{body}</p>
        </div>
      </div>
    </div>
  )
}
