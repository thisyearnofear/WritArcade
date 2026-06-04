import { getCurrentUser } from '@/lib/auth'
import { getCreatorStudioSummary } from '@/domains/creators/stats.service'
import { DashboardClient } from './DashboardClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CreatorStudio() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/')
  }

  const summary = await getCreatorStudioSummary(user.id, user.walletAddress)

  return <DashboardClient initialSummary={summary} />
}
