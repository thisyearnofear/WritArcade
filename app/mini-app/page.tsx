'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// Desktop gate component - shows QR and Warpcast CTA
function DesktopGate() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const miniAppUrl = `${origin}/mini-app`
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-md mx-auto"
        >
            <div className="space-y-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-600 font-black text-white italic text-4xl shadow-[0_0_30px_rgba(168,85,247,0.4)] mx-auto">
                    W
                </div>
                <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">Writers Arcade</h1>
            </div>

            <div className="space-y-6 p-8 rounded-2xl border border-white/10 bg-white/5">
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Mobile Experience Only</h2>
                    <p className="text-purple-300/80 text-sm">
                        The Writers Arcade mini-app is designed for mobile. 
                        Scan the QR code or open in Warpcast to continue.
                    </p>
                </div>

                {/* QR Code placeholder - using a styled div, can be replaced with actual QR component */}
                <div className="mx-auto w-48 h-48 bg-white rounded-xl p-3 flex items-center justify-center">
                    <div className="w-full h-full bg-gray-900 rounded flex items-center justify-center">
                        <svg 
                            className="w-40 h-40 text-white" 
                            viewBox="0 0 100 100"
                            fill="currentColor"
                        >
                            {/* Simplified QR-like pattern */}
                            <rect x="10" y="10" width="25" height="25" rx="2" />
                            <rect x="65" y="10" width="25" height="25" rx="2" />
                            <rect x="10" y="65" width="25" height="25" rx="2" />
                            <rect x="40" y="40" width="20" height="20" rx="1" />
                            <rect x="20" y="45" width="5" height="5" />
                            <rect x="30" y="50" width="5" height="5" />
                            <rect x="50" y="20" width="5" height="5" />
                            <rect x="55" y="25" width="5" height="5" />
                            <rect x="60" y="65" width="5" height="5" />
                            <rect x="70" y="45" width="5" height="5" />
                            <rect x="75" y="55" width="5" height="5" />
                            <rect x="45" y="70" width="5" height="5" />
                            <rect x="65" y="75" width="15" height="15" rx="1" />
                        </svg>
                    </div>
                </div>

                <div className="space-y-3">
                    <a 
                        href={`https://warpcast.com/~/compose?text=Check%20out%20Writers%20Arcade&embeds[]=${encodeURIComponent(miniAppUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button 
                            className="w-full h-12 bg-purple-600 hover:bg-purple-500 font-bold uppercase tracking-widest"
                        >
                            Open in Warpcast
                        </Button>
                    </a>
                    <a 
                        href="/"
                        className="block text-center text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Visit Desktop Site →
                    </a>
                </div>
            </div>
        </motion.div>
    )
}

export default function MiniAppPage() {
    const router = useRouter()
    const isDesktop = useMediaQuery('(min-width: 1024px)')

    // Gate desktop users
    if (isDesktop) {
        return (
            <div className="flex flex-col min-h-[100dvh] bg-[#0a0a14] items-center justify-center p-6 text-center">
                <DesktopGate />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[#0a0a14] items-center justify-center p-6 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 max-w-sm"
            >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-600 font-black text-white italic text-4xl shadow-[0_0_30px_rgba(168,85,247,0.4)] mx-auto">
                    W
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">Writers Arcade</h1>
                    <p className="text-purple-300/80">Turn articles into interactive fiction. Play, build, and support your favorite writers.</p>
                </div>

                <div className="pt-6 space-y-3">
                    <Button 
                        onClick={() => router.push('/mini-app/create')}
                        className="w-full h-12 bg-purple-600 hover:bg-purple-500 font-bold uppercase tracking-widest"
                    >
                        Build a Game
                    </Button>
                    <Button 
                        onClick={() => router.push('/mini-app/discovery')}
                        variant="outline"
                        className="w-full h-12 border-white/10 hover:bg-white/5"
                    >
                        Browse Arcade
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}
