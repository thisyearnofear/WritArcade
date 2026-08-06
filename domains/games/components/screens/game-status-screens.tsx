'use client'

import Link from 'next/link'
import { Clock, XCircle, Sparkles } from 'lucide-react'
import { Game } from '../../types'
import { ArcadeFunnelCTAs } from '@/components/daily-challenge/arcade-funnel-ctas'

interface GameStatusScreensProps {
  game: Game
}

function StatusShell({
  icon: Icon,
  title,
  description,
  game,
}: {
  icon: typeof Clock
  title: string
  description: string
  game: Game
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
          <Icon className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <ArcadeFunnelCTAs layout="stack" className="!flex-col" />
        <div className="flex flex-col items-center gap-2 pt-2">
          <Link
            href={`/games/${game.slug}`}
            className="text-xs font-medium text-purple-400 hover:text-purple-300"
          >
            View game page
          </Link>
          <Link
            href="/generate"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create a new game from an article
          </Link>
        </div>
      </div>
    </div>
  )
}

export function GameStatusScreens({ game }: GameStatusScreensProps) {
  if (game.approvalStatus === 'rejected') {
    return (
      <StatusShell
        icon={XCircle}
        title="Game not approved"
        description={
          game.rejectionReason
            ? `${game.rejectionReason} You can regenerate from the article or play something else in the arcade.`
            : 'This game did not match the article themes. Regenerate from the article or explore public games in the arcade.'
        }
        game={game}
      />
    )
  }

  if (game.approvalStatus === 'pending') {
    return (
      <StatusShell
        icon={Clock}
        title="Awaiting review"
        description="This game needs approval before play opens. Browse the arcade while you wait, or create another game from an article."
        game={game}
      />
    )
  }

  return null
}
