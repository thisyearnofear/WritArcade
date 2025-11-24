'use client'

import { useState } from 'react'
import { type WriterCoin } from '@/lib/writerCoins'

interface GameCustomizerProps {
    writerCoin: WriterCoin
    articleUrl: string
    onBack: () => void
}

export function GameCustomizer({ writerCoin, articleUrl, onBack }: GameCustomizerProps) {
    const [gameTitle, setGameTitle] = useState('')
    const [gameType, setGameType] = useState<'quiz' | 'trivia' | 'matching'>('quiz')
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerateGame = async () => {
        setIsGenerating(true)
        try {
            // TODO: Call API to generate game using AI
            // POST /api/games/generate
            const response = await fetch('/api/games/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: gameTitle,
                    type: gameType,
                    articleUrl,
                    writerCoinId: writerCoin.id,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to generate game')
            }

            const game = await response.json()
            // TODO: Navigate to game page or show success
            console.log('Game created:', game)
        } catch (error) {
            console.error('Error generating game:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div>
            <button
                onClick={onBack}
                className="mb-4 flex items-center space-x-2 text-purple-300 hover:text-purple-200"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
            </button>

            <h2 className="mb-2 text-2xl font-bold text-white">Customize Your Game</h2>
            <p className="mb-6 text-purple-200">Configure your game before generating it</p>

            <div className="space-y-6">
                {/* Game Title */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-purple-200">Game Title</label>
                    <input
                        type="text"
                        value={gameTitle}
                        onChange={(e) => setGameTitle(e.target.value)}
                        placeholder="My Article Game"
                        className="w-full rounded-lg border border-purple-500/30 bg-white/10 px-4 py-3 text-white placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    />
                </div>

                {/* Game Type */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-purple-200">Game Type</label>
                    <div className="space-y-2">
                        {(['quiz', 'trivia', 'matching'] as const).map((type) => (
                            <label key={type} className="flex items-center space-x-3 rounded-lg border border-purple-500/30 p-4 hover:bg-white/5">
                                <input
                                    type="radio"
                                    name="gameType"
                                    value={type}
                                    checked={gameType === type}
                                    onChange={(e) => setGameType(e.target.value as typeof type)}
                                    className="h-4 w-4"
                                />
                                <span className="capitalize text-purple-200">{type}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Cost Preview */}
                <div className="rounded-lg bg-purple-900/30 p-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-purple-300">Generation Cost:</span>
                            <span className="font-semibold text-purple-200">
                                {(Number(writerCoin.gameGenerationCost) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-purple-600 pt-2">
                            <span className="text-purple-300">Writer Revenue (60%):</span>
                            <span className="font-semibold text-green-400">
                                {(
                                    (Number(writerCoin.gameGenerationCost) / 10 ** writerCoin.decimals) * 0.6
                                ).toFixed(0)} {writerCoin.symbol}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerateGame}
                    disabled={!gameTitle || isGenerating}
                    className="w-full rounded-lg bg-purple-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isGenerating ? 'Generating Game...' : 'Generate Game'}
                </button>

                {/* Info */}
                <div className="rounded-lg bg-purple-900/30 p-4">
                    <p className="text-xs text-purple-300">
                        💡 <span className="font-semibold">What happens next:</span> We'll analyze the article and generate an interactive game using AI. You can then mint it as an NFT on Base.
                    </p>
                </div>
            </div>
        </div>
    )
}
