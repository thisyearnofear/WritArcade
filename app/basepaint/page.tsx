import type { Metadata } from 'next'
import { DailyChallengeView } from '@/components/daily-challenge/daily-challenge-view'

export const metadata: Metadata = {
  title: 'Daily Challenge — today\'s BasePaint canvas',
  description:
    'writersarcade Daily Challenge: today\'s BasePaint canvas is a shared story world. Same source, your secret encrypted modifier hand on Base.',
  openGraph: {
    title: 'writersarcade Daily Challenge — powered by BasePaint',
    description:
      'Play today\'s collaborative canvas as an interactive comic. Same source, unique narrative hand.',
  },
}

export default function BasePaintPage() {
  return <DailyChallengeView variant="basepaint" />
}
