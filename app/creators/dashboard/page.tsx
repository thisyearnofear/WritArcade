import { WRITER_COINS } from '@/lib/writerCoins'
import { getCreatorStats } from '@/domains/creators/stats.service'
import { LicenseConfigurator } from './LicenseConfigurator'

// Force dynamic rendering as we fetch data
export const dynamic = 'force-dynamic'

export default async function CreatorDashboard() {
    // Dashboard shows stats for the first configured Writer Coin (Fred Wilson / AVC)
    const writerCoin = WRITER_COINS[0]
    if (!writerCoin) {
        return <div className="p-10 text-white">No writer coins configured.</div>
    }

    const stats = await getCreatorStats(writerCoin.id)

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold">W</div>
                        <span className="font-bold text-lg">writersarcade <span className="text-gray-400 font-normal">| Creators</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">Connected as</span>
                        <span className="bg-gray-800 px-3 py-1 rounded-full text-sm font-mono border border-gray-700">
                            {writerCoin.address.slice(0, 6)}...{writerCoin.address.slice(-4)}
                        </span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold mb-8">Writer Dashboard</h1>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard label="Total Revenue" value={`${stats.totalRevenue} ${writerCoin.symbol}`} />
                    <StatCard label="Games Created" value={stats.totalGames.toString()} />
                    <StatCard label="IP Assets" value={stats.registeredIpAssets.toString()} sub="Registered on Story Protocol" />
                    <StatCard label="Royalty Rate" value={`${writerCoin.revenueDistribution.writer}%`} sub="Current License Term" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area - Left 2/3 */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* License Management */}
                        <LicenseConfigurator writerCoin={writerCoin} />

                        {/* Content Performances */}
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                            <h3 className="text-xl font-bold text-white mb-6">Top Performing Content</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-gray-400 text-sm border-b border-gray-800">
                                            <th className="pb-3 pl-2">Article Title</th>
                                            <th className="pb-3 text-right">Games</th>
                                            <th className="pb-3 text-right pr-2">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {stats.topArticles.map((article, i) => (
                                            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                                                <td className="py-4 pl-2 font-medium text-purple-200">{article.title}</td>
                                                <td className="py-4 text-right">{article.gamesCount}</td>
                                                <td className="py-4 text-right pr-2 text-green-400 font-mono">
                                                    {article.revenue} {writerCoin.symbol}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Right 1/3 */}
                    <div className="space-y-6">
                        {/* Actions */}
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                            <h4 className="font-bold mb-4">Quick Actions</h4>
                            <a
                                href={`https://basescan.org/address/${writerCoin.paymentContractAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full mb-3 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors text-center"
                            >
                                Claim Revenue
                            </a>
                            <a
                                href={`https://explorer.story.foundation/address/${writerCoin.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-gray-800 text-gray-300 font-bold py-3 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 text-center"
                            >
                                View on Story Explorer
                            </a>
                        </div>

                        {/* Treasury Status */}
                        <div className="bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-500/20 rounded-lg p-6">
                            <h4 className="font-bold text-green-400 mb-2">Treasury Check</h4>
                            <div className="text-3xl font-bold text-white mb-1">{stats.totalRevenue} {writerCoin.symbol}</div>
                            <p className="text-xs text-green-200/60 mb-4">Available to claim</p>
                            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-3/4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function StatCard({ label, value, trend, sub }: { label: string, value: string, trend?: string, sub?: string }) {
    return (
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
            <p className="text-gray-400 text-sm mb-1">{label}</p>
            <p className="text-2xl font-bold text-white mb-2">{value}</p>
            {trend && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">{trend}</span>}
            {sub && <span className="text-xs text-gray-500">{sub}</span>}
        </div>
    )
}
