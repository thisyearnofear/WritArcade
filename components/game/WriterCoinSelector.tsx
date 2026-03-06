'use client'

import { WRITER_COINS, type WriterCoin } from '@/lib/writerCoins'
import { motion } from 'framer-motion'

interface WriterCoinSelectorProps {
    onSelect: (coin: WriterCoin) => void
}

export function WriterCoinSelector({ onSelect }: WriterCoinSelectorProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Select Origin</h2>
                <p className="text-sm text-purple-300/80">
                    Choose which writer coin will power this generation
                </p>
            </div>

            <div className="grid gap-4">
                {WRITER_COINS.map((coin, index) => (
                    <motion.button
                        key={coin.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(coin)}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-purple-500/50 hover:bg-white/10"
                    >
                        {/* Hover Gradient Effect */}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-2xl font-black text-purple-400 ring-1 ring-purple-500/30 group-hover:bg-purple-500/30 group-hover:text-purple-300 transition-colors">
                                    {coin.symbol.slice(0, 1)}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-200 transition-colors">{coin.name}</h3>
                                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 ring-1 ring-purple-500/30">
                                            {coin.symbol}
                                        </span>
                                    </div>
                                    <p className="text-sm text-purple-300/60">
                                        by <span className="font-semibold text-purple-300/80">{coin.writer}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end space-y-1 text-right">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400/60">Generate Cost</div>
                                <div className="font-mono text-sm font-bold text-white">
                                    {(Number(coin.gameGenerationCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                </div>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="mt-4 flex items-center space-x-4 border-t border-white/5 pt-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400/40">Mint Price</span>
                                <span className="text-xs font-medium text-purple-200/70">
                                    {(Number(coin.mintCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                </span>
                            </div>
                            <div className="h-4 w-px bg-white/5" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400/40">Status</span>
                                <span className="flex items-center space-x-1 text-xs font-medium text-green-400/70">
                                    <span className="h-1 w-1 rounded-full bg-green-500" />
                                    <span>Verified</span>
                                </span>
                            </div>
                        </div>
                    </motion.button>
                ))}

                {WRITER_COINS.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                        <p className="text-sm text-purple-300/40 font-medium italic">No active coins detected...</p>
                    </div>
                )}
            </div>

            <div className="rounded-2xl bg-purple-500/5 p-4 border border-purple-500/10">
                <div className="flex items-start space-x-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-400 ring-1 ring-purple-500/30">
                        !
                    </div>
                    <p className="text-xs leading-relaxed text-purple-300/70">
                        <span className="font-bold text-purple-300">PROTOCOL NOTE:</span> Select a coin to authorize the generation process. Each writer coin ecosystem has unique rewards and features.
                    </p>
                </div>
            </div>
        </div>
    )
}