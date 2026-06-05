import { WorkshopClient } from './workshop-client'

export const metadata = {
  title: 'Workshop',
  description: 'Decompose articles into game assets, refine your interactive fiction, and register IP on-chain.',
  robots: { index: false, follow: false },
}

export default function WorkshopPage() {
  return <WorkshopClient />
}
