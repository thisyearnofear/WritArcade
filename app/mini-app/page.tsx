'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { readyMiniApp, getFarcasterContext, isInFarcasterContext, openUrl, type FarcasterUser } from '@/lib/farcaster'
import { WriterCoinSelector } from './components/WriterCoinSelector'
import { ArticleInput } from './components/ArticleInput'
import { GameCustomizer } from './components/GameCustomizer'
import { GamePlayer } from './components/GamePlayer'
import { MiniAppMobileNav } from './components/MiniAppMobileNav'
import { type WriterCoin } from '@/lib/writerCoins'
import type { Game } from '@/domains/games/types'
import Image from 'next/image'

export default function MiniAppPage() {
    const [isInitialized, setIsInitialized] = useState(false)
    const [user, setUser] = useState<FarcasterUser | null>(null)
    const [isInFrame, setIsInFrame] = useState(false)
    const [selectedCoin, setSelectedCoin] = useState<WriterCoin | null>(null)
    const [articleUrl, setArticleUrl] = useState('')
    const [generatedGame, setGeneratedGame] = useState<Game | null>(null)
    const [step, setStep] = useState<'select-coin' | 'input-article' | 'customize-game' | 'play-game'>('select-coin')

    const init = useCallback(async () => {
        const context = await getFarcasterContext()
        if (context) {
            setUser(context.user)
            setIsInFrame(true)
        } else {
            setIsInFrame(await isInFarcasterContext())
        }

        setIsInitialized(true)
        await readyMiniApp()
    }, [])

    // Use useSyncExternalStore pattern: initialize on mount
     
    useEffect(() => {
        init()
    }, [init])

    const handleCoinSelect = (coin: WriterCoin) => {
        setSelectedCoin(coin)
        setStep('input-article')
    }

    const handleArticleSubmit = (url: string) => {
        setArticleUrl(url)
        setStep('customize-game')
    }

    const handleBack = useCallback(() => {
        if (step === 'play-game') {
            setGeneratedGame(null)
            setStep('customize-game')
        } else if (step === 'customize-game') {
            setStep('input-article')
        } else if (step === 'input-article') {
            setStep('select-coin')
            setSelectedCoin(null)
        }
    }, [step])

    const handleGameGenerated = (game: unknown) => {
        if ((game as { mode?: string }).mode === 'wordle') {
            const slug = (game as { slug?: string }).slug
            if (slug) {
                const origin = typeof window !== 'undefined' ? window.location.origin : ''
                openUrl(`${origin}/games/${slug}`).catch(console.error)
            }
            return
        }

        setGeneratedGame(game as Game)
        setStep('play-game')
    }

    const canGoBack = step !== 'select-coin'

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[#0a0a14]">
            {/* Minimal Header for Mobile / Desktop Consistency */}
            <header className="sticky top-0 z-[60] border-b border-white/5 bg-[#0a0a14]/60 backdrop-blur-2xl">
                <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
                    <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 font-black text-white italic text-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                            W
                        </div>
                        <h1 className="text-md font-black tracking-tighter text-white uppercase italic hidden sm:block">writersarcade</h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        {user && (
                            <div className="flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 p-1 pr-3 hover:bg-white/10 transition-colors">
                                {user.pfpUrl ? (
                                    <Image
                                        src={user.pfpUrl}
                                        alt={user.username || 'User'}
                                        width={24}
                                        height={24}
                                        className="rounded-full ring-1 ring-purple-500/30"
                                    />
                                ) : (
                                    <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-bold">
                                        {user.username?.slice(0, 1).toUpperCase() || 'U'}
                                    </div>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                    {user.username || 'Player'}
                                </span>
                            </div>
                        )}
                        
                        {!isInFrame && (
                            <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-x-hidden pt-4 pb-32">
                <div className="mx-auto max-w-2xl px-4">
                    <AnimatePresence mode="wait">
                        {!isInitialized ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-32 text-center"
                            >
                                <div className="relative mb-8 h-16 w-16">
                                    <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20"></div>
                                    <div className="relative flex h-full w-full items-center justify-center rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight uppercase italic">Synthesizing...</h2>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="content"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-6"
                            >
                                {/* Phase Indicator (Desktop Only) */}
                                <div className="hidden md:flex items-center justify-between px-2 mb-8">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Current Phase</span>
                                        <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                                            {step === 'select-coin' && '1. Choose Origin'}
                                            {step === 'input-article' && '2. Load Target'}
                                            {step === 'customize-game' && '3. Build Params'}
                                            {step === 'play-game' && '4. Arena Active'}
                                        </h2>
                                    </div>
                                    <div className="flex space-x-1.5">
                                        {[1, 2, 3, 4].map((num) => (
                                            <div
                                                key={num}
                                                className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
                                                    (num === 1 && step === 'select-coin') ||
                                                    (num === 2 && step === 'input-article') ||
                                                    (num === 3 && step === 'customize-game') ||
                                                    (num === 4 && step === 'play-game')
                                                        ? 'w-10 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]'
                                                        : num < (step === 'select-coin' ? 1 : step === 'input-article' ? 2 : step === 'customize-game' ? 3 : 4)
                                                        ? 'bg-green-500/60'
                                                        : 'bg-white/10'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step}
                                        initial={{ opacity: 0, scale: 0.98, x: 20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.98, x: -20 }}
                                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    >
                                        {step === 'select-coin' && <WriterCoinSelector onSelect={handleCoinSelect} />}
                                        {step === 'input-article' && selectedCoin && (
                                            <ArticleInput
                                                writerCoin={selectedCoin}
                                                onSubmit={handleArticleSubmit}
                                                onBack={handleBack}
                                            />
                                        )}
                                        {step === 'customize-game' && selectedCoin && articleUrl && (
                                            <GameCustomizer
                                                writerCoin={selectedCoin}
                                                articleUrl={articleUrl}
                                                onBack={handleBack}
                                                onGameGenerated={handleGameGenerated}
                                            />
                                        )}
                                        {step === 'play-game' && generatedGame && selectedCoin && (
                                            <GamePlayer
                                                game={generatedGame}
                                                onBack={handleBack}
                                                writerCoin={selectedCoin}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Mobile-Only Navigation */}
            {isInitialized && (
                <MiniAppMobileNav 
                    step={step} 
                    onBack={handleBack} 
                    canGoBack={canGoBack} 
                />
            )}
        </div>
    )
}


