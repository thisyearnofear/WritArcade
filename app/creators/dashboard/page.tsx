import { getCurrentUser } from '@/lib/auth'
import { getCreatorStats } from '@/domains/creators/stats.service'
import { DashboardClient } from './DashboardClient'
import { redirect } from 'next/navigation'

// Force dynamic rendering as we fetch data
export const dynamic = 'force-dynamic'

export default async function CreatorDashboard() {
    const user = await getCurrentUser()
    
    // Redirect to home if not logged in
    if (!user) {
        redirect('/')
    }

    const stats = await getCreatorStats(user.walletAddress)

    return (
        <div className="min-h-screen bg-[#0a0a14] text-white font-sans selection:bg-purple-500/30">
            <DashboardClient user={user} initialStats={stats} />
        </div>
    )
}
