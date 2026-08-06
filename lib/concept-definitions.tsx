import { ConceptTooltip } from '@/components/ui/concept-tooltip'

export const CONCEPTS = {
  mint: {
    term: 'Mint',
    explanation:
      'Create a unique digital collectible on Base that proves you own this game. Required to decrypt the secret epilogue.',
  },
  storyIp: {
    term: 'Story IP',
    explanation:
      'Register your game on Story Protocol so ownership and royalties are tracked on-chain.',
  },
  secretEpilogue: {
    term: 'Secret epilogue',
    explanation:
      'A bonus ending encrypted on Base (Inco). Play through all 5 panels, then mint the NFT to reveal it.',
  },
  inco: {
    term: 'Inco',
    explanation:
      'Confidential compute on Base. Your secret epilogue and daily modifier cards stay encrypted until you unlock them.',
  },
  dailyChallenge: {
    term: 'Daily Challenge',
    explanation:
      'Everyone plays the same source today with different encrypted modifier cards. Compare scores on the leaderboard.',
  },
  writerCoin: {
    term: 'Writer coin',
    explanation:
      'Tokens tied to supported writers. Creating and minting games routes a share of fees to the original author.',
  },
} as const

type ConceptKey = keyof typeof CONCEPTS

export function ConceptTerm({
  concept,
  children,
}: {
  concept: ConceptKey
  children: React.ReactNode
}) {
  const { term, explanation } = CONCEPTS[concept]
  return (
    <ConceptTooltip term={term} explanation={explanation}>
      {children}
    </ConceptTooltip>
  )
}
