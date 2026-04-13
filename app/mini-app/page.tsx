'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function MiniAppPage() {
    const router = useRouter()

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
                    <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">WritArcade</h1>
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
