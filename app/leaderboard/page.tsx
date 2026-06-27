import { LeaderboardClient } from './leaderboard-client'

export const metadata = {
  title: 'Leaderboard — Most Played',
  description:
    'The most played games on WritersArcade. See which interactive stories and wordles are trending.',
  alternates: { canonical: '/leaderboard' },
  openGraph: {
    title: 'Leaderboard — Most Played',
    description: 'See which games are trending on WritersArcade.',
    type: 'website',
  },
}

export default function LeaderboardPage() {
  return <LeaderboardClient />
}
