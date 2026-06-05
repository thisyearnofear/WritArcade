import { GamesClient } from './games-client'

export const metadata = {
  title: 'The Arcade',
  description:
    'Browse and play interactive games generated from articles by supported writers on writersarcade. Filter by genre, collect NFTs, and own the experience.',
  alternates: { canonical: '/games' },
  openGraph: {
    title: 'The Arcade',
    description:
      'Interactive games generated from articles by supported writers. Play, collect, and own the experience.',
    type: 'website',
  },
}

export default function GamesPage() {
  return <GamesClient />
}
