'use client'

import { WRITER_COINS, type WriterCoin } from '@/lib/writerCoins'
import { ExternalLink } from 'lucide-react'

interface WriterCoinSelectorProps {
    onSelect: (coin: WriterCoin) => void
}

export function WriterCoinSelector({ onSelect }: WriterCoinSelectorProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-xl font-semibold text-white">Choose a writer</h2>
                <p className="text-sm text-gray-400">
                    Games are generated from articles by supported writers. Select one to begin.
                </p>
            </div>

            <div className="grid gap-3">
                {WRITER_COINS.map((coin) => (
                    <button
                        key={coin.id}
                        onClick={() => onSelect(coin)}
                        className="group w-full rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-left transition-all hover:border-gray-600 hover:bg-gray-900"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-sm font-bold text-gray-300 group-hover:bg-gray-700 transition-colors">
                                    {coin.symbol.replace('$', '').slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-white text-sm">{coin.writer}</span>
                                        <span className="text-xs text-gray-500">{coin.symbol}</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{coin.bio}</p>
                                </div>
                            </div>
                            <a
                                href={coin.paragraphUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors mt-0.5"
                                aria-label={`Visit ${coin.writer}'s publication`}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                        <div className="mt-3 flex items-center gap-4 border-t border-gray-800 pt-3">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-gray-600">Generate</span>
                                <p className="text-xs font-medium text-gray-300">
                                    {(Number(coin.gameGenerationCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                </p>
                            </div>
                            <div className="h-3 w-px bg-gray-800" />
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-gray-600">Mint</span>
                                <p className="text-xs font-medium text-gray-300">
                                    {(Number(coin.mintCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <p className="text-xs text-gray-600">
                Each game is attributed to the original article and writer on-chain via Story Protocol.
            </p>
        </div>
    )
}