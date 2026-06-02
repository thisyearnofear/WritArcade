'use client';

import { useState, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import { type AuthUser } from '@/lib/auth';
import { type CreatorStats } from '@/domains/creators/stats.service';
import { WRITER_COINS } from '@/lib/writerCoins';
import { Badge } from '@/components/ui/badge';
import { LicenseConfigurator } from './LicenseConfigurator';
import { useGetCurrentAccount } from '@mezo-org/passport';
import {
    createStoryClientFromWallet,
    isOnStoryNetwork,
    STORY_CHAIN_ID,
} from '@/lib/story-sdk-client';
import { mintLicenseTokens } from '@/lib/story-license.service';
import { 
    Trophy, 
    Coins, 
    Zap, 
    ShieldCheck, 
    ExternalLink, 
    Wallet, 
    TrendingUp,
    FileText,
    ChevronRight,
    Sparkles,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DashboardClientProps {
    user: AuthUser;
    initialStats: CreatorStats;
}

export function DashboardClient({ user, initialStats }: DashboardClientProps) {
    const [stats] = useState(initialStats);
    const { data: mezoAccount } = useGetCurrentAccount();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { data: walletClient } = useWalletClient();
    const [mintingIp, setMintingIp] = useState<string | null>(null);
    const [mintResult, setMintResult] = useState<{ [ipId: string]: string }>({});
    const [mintError, setMintError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [claimResult, setClaimResult] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const onStoryNetwork = isOnStoryNetwork(chainId);
    const activeWriterCoin = WRITER_COINS[0];

    const handleSwitchChain = useCallback(async () => {
        if (!switchChain) return;
        try {
            await switchChain({ chainId: STORY_CHAIN_ID });
        } catch (err) {
            console.error('Failed to switch network:', err);
        }
    }, [switchChain]);

    const handleMintLicenseTokens = useCallback(async (ipId: string, gameTitle: string) => {
        if (!walletClient || !address || !onStoryNetwork) {
            if (!onStoryNetwork) await handleSwitchChain();
            else setMintError('Connect your wallet first');
            return;
        }

        setMintingIp(ipId);
        setMintError(null);

        try {
            const storyClient = createStoryClientFromWallet(walletClient);
            if (!storyClient) throw new Error('Failed to initialize Story client');

            const result = await mintLicenseTokens(storyClient, {
                licensorIpId: ipId as `0x${string}`,
                licenseTermsId: 2,
                receiver: address as `0x${string}`,
                amount: 1,
            });

            setMintResult((prev) => ({ ...prev, [ipId]: result.txHash }));
        } catch (err) {
            setMintError(err instanceof Error ? err.message : 'Minting failed');
        } finally {
            setMintingIp(null);
        }
    }, [walletClient, address, onStoryNetwork, handleSwitchChain]);

    const handleClaimFromPool = useCallback(async () => {
        if (!walletClient || !address || !onStoryNetwork) {
            if (!onStoryNetwork) await handleSwitchChain();
            else setMintError('Connect your wallet first');
            return;
        }

        setClaiming(true);
        setClaimResult(null);

        try {
            const storyClient = createStoryClientFromWallet(walletClient);
            if (!storyClient) throw new Error('Failed to initialize Story client');

            const { collectAndDistributeGroupRoyalties } = await import('@/lib/story-grouping.service');
            const memberIpIds = stats.registeredGames
                .filter((g) => g.storyIpId)
                .map((g) => g.storyIpId as `0x${string}`);

            if (!stats.storyGroupIpId) throw new Error('No group IP found');
            if (memberIpIds.length === 0) throw new Error('No registered IPs to distribute');

            const result = await collectAndDistributeGroupRoyalties(
                storyClient,
                stats.storyGroupIpId as `0x${string}`,
                memberIpIds,
            );

            setClaimResult(result.txHash);
        } catch (err) {
            setMintError(err instanceof Error ? err.message : 'Claim failed');
        } finally {
            setClaiming(false);
        }
    }, [walletClient, address, onStoryNetwork, handleSwitchChain, stats.storyGroupIpId, stats.registeredGames]);

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a14]">
            {/* Minimal Header */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/60 backdrop-blur-2xl">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center font-black italic shadow-[0_0_15px_rgba(168,85,247,0.4)]">W</div>
                        <span className="font-black text-lg tracking-tighter uppercase italic">writersarcade <span className="text-purple-400/60 font-medium not-italic ml-1">Creator Hub</span></span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none mb-1">Active Wallet</span>
                            <span className="text-xs font-mono text-white/80">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</span>
                        </div>
                        <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 max-w-7xl">
                {/* Hero Section */}
                <div className="mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-[0.2em] text-[10px]">
                                <Sparkles className="w-3 h-3" />
                                Protocol Statistics
                            </div>
                            <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter">Creator Dashboard</h1>
                            <p className="text-white/40 max-w-xl text-sm leading-relaxed">
                                Monitor your cross-chain revenue from the Mezo and Base networks. Manage your intellectual property via Story Protocol.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                             {mezoAccount?.totalMats !== undefined && (
                                <div className="bg-amber-500/20 border border-amber-500/40 px-4 py-2 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-400/60 leading-none mb-1">Mezo Mats</span>
                                        <span className="text-lg font-black text-white leading-none italic">{mezoAccount.totalMats.toLocaleString()}</span>
                                    </div>
                                </div>
                             )}
                             <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Mezo Matsnet Live</span>
                             </div>
                        </div>
                    </motion.div>
                </div>

                {/* Primary Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    <StatCard 
                        label="Total MUSD Earned" 
                        value={stats.totalRevenueMUSD} 
                        unit="MUSD"
                        icon={<Zap className="w-5 h-5 text-amber-500" />}
                        color="amber"
                        sub="Mezo Hackathon Revenue"
                    />
                    <StatCard 
                        label="WriterCoin Revenue" 
                        value={stats.totalRevenueWriterCoins} 
                        unit="TOKENS"
                        icon={<Coins className="w-5 h-5 text-purple-500" />}
                        color="purple"
                        sub="Base Mainnet Splits"
                    />
                    <StatCard 
                        label="Games Synthesized" 
                        value={stats.totalGames.toString()} 
                        icon={<Trophy className="w-5 h-5 text-green-500" />}
                        color="green"
                    />
                    <StatCard 
                        label="IP Assets Registered" 
                        value={stats.registeredIpAssets.toString()} 
                        icon={<ShieldCheck className="w-5 h-5 text-indigo-500" />}
                        color="indigo"
                        sub="Story Protocol Aeneid"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Content & Performance */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Article Performance */}
                        <section className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Top Content Performance</h3>
                                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Revenue by Source Article</p>
                                </div>
                                <TrendingUp className="w-5 h-5 text-green-500 opacity-50" />
                            </div>

                            <div className="space-y-3">
                                {stats.topArticles.length > 0 ? stats.topArticles.map((article, i) => (
                                    <div key={i} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all hover:bg-white/[0.04]">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-white truncate pr-4">{article.title.replace('https://paragraph.xyz/', '')}</h4>
                                                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">{article.gamesCount} Generations</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <div className="text-sm font-mono font-black text-amber-400">{article.revenueMUSD} MUSD</div>
                                            <div className="text-[10px] font-mono text-white/30">{article.revenueWriterCoin} WriterCoins</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                        <p className="text-sm text-white/20 italic">No content performance data available yet.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Story Protocol License Config */}
                        <section className="relative overflow-hidden rounded-[32px] border border-white/5 bg-purple-900/5 p-1">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
                            <LicenseConfigurator writerCoin={activeWriterCoin} />
                        </section>
                    </div>

                    {/* Right Column: Actions & Identity */}
                    <div className="space-y-6">
                        {/* Protocol Identity */}
                        <section className="bg-gradient-to-br from-amber-900/20 to-black border border-amber-500/20 rounded-[32px] p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-900/40 ring-2 ring-amber-400/50">
                                    M
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white tracking-tight uppercase italic leading-none">Mezo Identity</h4>
                                    <p className="text-[10px] text-amber-400/60 font-black uppercase tracking-widest mt-1">Verified on Matsnet</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">BTC Address</span>
                                    <p className="text-xs font-mono text-amber-200/80 break-all">{user.walletAddress}</p>
                                </div>
                                <button className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs transition-all hover:bg-amber-400 active:scale-95 shadow-xl">
                                    Manage Mezo Passport
                                </button>
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 italic">Quick Links</h4>
                            <div className="grid gap-3">
                                <ActionButton 
                                    label="Basescan (Base)" 
                                    href={`https://basescan.org/address/${user.walletAddress}`}
                                    icon={<ShieldCheck className="w-4 h-4" />}
                                />
                                <ActionButton 
                                    label="Mezo Explorer" 
                                    href={`https://explorer.test.mezo.org/address/${user.walletAddress}`}
                                    icon={<Zap className="w-4 h-4" />}
                                />
                                <ActionButton 
                                    label="Story Explorer" 
                                    href={`https://aeneid-testnet-explorer.story.foundation/`}
                                    icon={<ExternalLink className="w-4 h-4" />}
                                />
                            </div>
                        </section>

                        {/* Story Protocol IP Assets */}
                        <section className="bg-white/[0.03] border border-white/5 rounded-[32px] p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Story Protocol</h4>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">IP Assets & Royalty Pool</p>
                                </div>
                                <ShieldCheck className="w-5 h-5 text-purple-400" />
                            </div>

                            {/* Group IP */}
                            <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Group IP</span>
                                    <Badge variant="outline" className={`text-[9px] ${stats.storyGroupIpId ? 'text-green-400 border-green-500/30' : 'text-amber-400 border-amber-500/30'}`}>
                                        {stats.storyGroupIpId ? 'Active' : 'Not Created'}
                                    </Badge>
                                </div>
                                {stats.storyGroupIpId ? (
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono text-purple-300/60 truncate flex-1">{stats.storyGroupIpId}</code>
                                        <button
                                            onClick={() => copyToClipboard(stats.storyGroupIpId!, 'groupIp')}
                                            className="p-1 hover:bg-white/5 rounded transition-colors"
                                        >
                                            {copiedField === 'groupIp' ? (
                                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                            ) : (
                                                <Copy className="w-3 h-3 text-white/40" />
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-white/30 italic">Auto-created on first IP registration</p>
                                )}
                            </div>

                            {/* Registered IPs */}
                            {stats.registeredGames.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">
                                        Registered Games ({stats.registeredGames.length})
                                    </span>
                                    {stats.registeredGames.slice(0, 5).map((game) => (
                                        <div key={game.gameId} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <span className="text-xs font-medium text-white/80 truncate">{game.title}</span>
                                                <Badge variant="outline" className="text-[8px] uppercase tracking-wider">{game.genre}</Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <code className="text-[9px] font-mono text-white/30">{game.storyIpId.slice(0, 10)}...</code>
                                                {mintResult[game.storyIpId] ? (
                                                    <div className="flex items-center gap-1 text-[10px] text-green-400">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Minted
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleMintLicenseTokens(game.storyIpId, game.title)}
                                                        disabled={mintingIp === game.storyIpId || !onStoryNetwork || !isConnected}
                                                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {mintingIp === game.storyIpId ? (
                                                            <span className="flex items-center gap-1">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Minting
                                                            </span>
                                                        ) : (
                                                            'Mint License'
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Network Status & Actions */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${onStoryNetwork ? 'bg-green-500' : 'bg-amber-500'}`} />
                                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                            {onStoryNetwork ? 'Story Aeneid' : 'Switch to Story'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleSwitchChain}
                                        className="text-[10px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 transition-colors"
                                    >
                                        {onStoryNetwork ? '✓' : 'Switch'}
                                    </button>
                                </div>

                                {/* Claim from Group Pool */}
                                {stats.storyGroupIpId && stats.registeredGames.length > 0 && (
                                    <button
                                        onClick={handleClaimFromPool}
                                        disabled={claiming || !onStoryNetwork || !isConnected}
                                        className="w-full py-3 px-4 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-purple-600/30 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        {claiming ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Claiming...
                                            </span>
                                        ) : claimResult ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Claimed
                                            </span>
                                        ) : (
                                            'Claim from Group Pool'
                                        )}
                                    </button>
                                )}
                            </div>

                            {mintError && (
                                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                                    <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-red-300">{mintError}</p>
                                </div>
                            )}
                        </section>

                        {/* Promotion / Note */}
                        <div className="p-6 rounded-[24px] bg-green-500/5 border border-green-500/10 flex items-start gap-4">
                            <div className="mt-1 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-[10px] font-black text-green-400 italic">!</div>
                            <p className="text-[10px] leading-relaxed text-green-200/40 uppercase tracking-widest font-bold">
                                Cross-chain settlement is active. Revenue from Mezo MUSD payments is atomically forwarded to your connected wallet address on Matsnet.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, unit, icon, color, sub }: { label: string, value: string, unit?: string, icon: React.ReactNode, color: 'amber' | 'purple' | 'green' | 'indigo', sub?: string }) {
    const colorClasses = {
        amber: 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50',
        purple: 'border-purple-500/20 bg-purple-500/5 hover:border-purple-500/50',
        green: 'border-green-500/20 bg-green-500/5 hover:border-green-500/50',
        indigo: 'border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/50',
    };

    const textClasses = {
        amber: 'text-amber-400',
        purple: 'text-purple-400',
        green: 'text-green-400',
        indigo: 'text-indigo-400',
    };

    return (
        <motion.div 
            whileHover={{ y: -4 }}
            className={cn("p-6 rounded-[32px] border transition-all duration-300 group", colorClasses[color])}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 transition-colors group-hover:border-white/10">
                    {icon}
                </div>
                {unit && <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{unit}</span>}
            </div>
            <p className="text-3xl font-black text-white tracking-tighter italic uppercase">{value}</p>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">{label}</p>
            {sub && <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-3 opacity-60", textClasses[color])}>{sub}</p>}
        </motion.div>
    );
}

function ActionButton({ label, href, icon }: { label: string, href: string, icon: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all group"
        >
            <div className="flex items-center gap-3">
                <div className="text-white/40 group-hover:text-purple-400 transition-colors">{icon}</div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{label}</span>
            </div>
            <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white transition-all transform group-hover:translate-x-1" />
        </a>
    );
}
