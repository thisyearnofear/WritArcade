import { motion } from 'framer-motion'
import { ExternalLink, ShieldCheck, Box } from 'lucide-react'

// Define local interfaces based on what we expect from the API/DB
interface Asset {
    id: string
    title: string
    type: string
    storyRegistration?: {
        storyIpId: string
        status: string
    } | null
}

interface IPAttributionProps {
    assets: Asset[]
    explorerUrl?: string
    compact?: boolean
}

export function IPAttribution({ assets, explorerUrl = "https://aeneid-testnet-explorer.story.foundation/ip/", compact = false }: IPAttributionProps) {
    if (!assets || assets.length === 0) return null

    if (compact) {
        return (
            <div className="flex flex-wrap items-center gap-2 py-3 px-4 rounded-lg border border-border bg-muted/50 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">IP:</span>
                {assets.map((asset) => {
                    const isMinted = !!asset.storyRegistration?.storyIpId
                    return isMinted ? (
                        <a
                            key={asset.id}
                            href={`${explorerUrl}${asset.storyRegistration!.storyIpId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                        >
                            {asset.title}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    ) : (
                        <span key={asset.id} className="text-muted-foreground">{asset.title}</span>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                IP Lineage & Attribution
            </h3>

            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
                This game is a **Derivative Work** composed of the following IP Assets.
                Royalties and attribution are tracked on-chain via Story Protocol.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assets.map((asset, index) => {
                    const isMinted = !!asset.storyRegistration?.storyIpId

                    return (
                        <motion.div
                            key={asset.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-xl border ${isMinted ? 'border-amber-500/30 bg-amber-900/10' : 'border-border bg-muted/50'} flex items-center justify-between group hover:border-amber-500/50 transition-colors`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isMinted ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-foreground'}`}>
                                    <Box className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">{asset.title}</h4>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="bg-muted px-2 py-0.5 rounded text-foreground capitalize">{asset.type}</span>
                                        {isMinted && (
                                            <span className="text-green-500 flex items-center gap-1">
                                                ● On-Chain IP
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isMinted && (
                                <a
                                    href={`${explorerUrl}${asset.storyRegistration!.storyIpId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="View on Story Explorer"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            <div className="mt-6 flex justify-center">
                <div className="text-xs text-center text-muted-foreground font-mono border border-border bg-muted/50 px-4 py-2 rounded-full">
                    Story Protocol Network: Aeneid Testnet
                </div>
            </div>
        </div>
    )
}
