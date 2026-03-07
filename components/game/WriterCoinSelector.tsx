'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { WRITER_COINS, type WriterCoin } from '@/lib/writerCoins'

interface WriterCoinSelectorProps {
    onSelect: (coin: WriterCoin) => void
}

export function WriterCoinSelector({ onSelect }: WriterCoinSelectorProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const hovered = hoveredId ? WRITER_COINS.find((c) => c.id === hoveredId) ?? null : null

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Choose a writer</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Games are generated from articles by supported writers.
                </p>
            </div>

            {/* Compact pill row */}
            <div className="flex flex-wrap gap-2">
                {WRITER_COINS.map((coin) => (
                    <button
                        key={coin.id}
                        onClick={() => onSelect(coin)}
                        onMouseEnter={() => setHoveredId(coin.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onFocus={() => setHoveredId(coin.id)}
                        onBlur={() => setHoveredId(null)}
                        className="group flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-left transition-all hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
                    >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                            {coin.symbol.replace('$', '').slice(0, 2)}
                        </span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{coin.writer}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{coin.symbol}</span>
                    </button>
                ))}
            </div>

            {/* Progressive disclosure: bio + costs on hover/focus */}
            <div className="min-h-[3.5rem]">
                {hovered ? (
                    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-3 py-2.5 text-sm transition-all">
                        <div className="min-w-0">
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{hovered.bio}</p>
                            <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">
                                Generate {(Number(hovered.gameGenerationCost) / 10 ** hovered.decimals).toFixed(0)} {hovered.symbol}
                                {' · '}
                                Mint {(Number(hovered.mintCost) / 10 ** hovered.decimals).toFixed(0)} {hovered.symbol}
                            </p>
                        </div>
                        <a
                            href={hovered.paragraphUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-0.5"
                            aria-label={`Visit ${hovered.writer}'s publication`}
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                ) : (
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 px-1">
                        Hover a writer to see details. Each game is attributed on-chain via Story Protocol.
                    </p>
                )}
            </div>
        </div>
    )
}