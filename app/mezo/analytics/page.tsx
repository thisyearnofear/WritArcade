import { MezoAnalyticsClient } from './mezo-analytics-client'

export const metadata = {
  title: 'Mezo Analytics',
  description: 'Live on-chain data from the MezoBoostedSplitter contract — royalty pools, Mats balances, and payment flows.',
  robots: { index: false, follow: false },
}

export default function MezoAnalyticsPage() {
  return <MezoAnalyticsClient />
}
