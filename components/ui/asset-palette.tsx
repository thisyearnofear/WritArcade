'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'

interface PaletteAsset {
    id: string
    title: string
    description: string
    type: string
    content: unknown
}

interface AssetPaletteProps {
    isOpen: boolean
    onClose: () => void
    onInject: (asset: PaletteAsset) => void
}

/**
 * Horizontal scrolling asset palette for marketplace discovery
 * Replaces the sidebar for more integrated UX
 */
export function AssetPalette({ isOpen, onClose, onInject }: AssetPaletteProps) {
    const [assets, setAssets] = useState<PaletteAsset[]>([])
    const [loading, setLoading] = useState(false)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) {
            fetchAssets()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const fetchAssets = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/assets/marketplace')
            const { data } = await res.json()
            if (data && data.assets) {
                setAssets(data.assets)
                updateScrollButtons()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const updateScrollButtons = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = 300
            const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -amount : amount)
            scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
            setTimeout(updateScrollButtons, 300)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 shadow-2xl"
            >
                <div className="max-w-6xl mx-auto p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white">Marketplace Assets</h3>
                            <p className="text-xs text-muted-foreground">Drag or click to add</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Scroll buttons */}
                            {canScrollLeft && (
                                <button
                                    onClick={() => scroll('left')}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-colors"
                                    title="Scroll left"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}

                            {/* Asset scroll container */}
                            <div
                                ref={scrollContainerRef}
                                onScroll={updateScrollButtons}
                                className="flex gap-4 overflow-x-auto pb-2 px-8"
                                style={{ scrollBehavior: 'smooth' }}
                            >
                                {assets.map((asset) => (
                                    <motion.div
                                        key={asset.id}
                                        whileHover={{ scale: 1.05 }}
                                        className="flex-shrink-0 w-64 bg-card border border-border hover:border-purple-500/50 rounded-xl p-4 cursor-pointer transition-all group"
                                        onClick={() => onInject(asset)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-foreground flex-1">{asset.title}</h4>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex-shrink-0 ${getTypeColor(asset.type)}`}>
                                                {asset.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                            {asset.description}
                                        </p>
                                        <button className="w-full py-2 bg-muted group-hover:bg-purple-600 group-hover:text-white text-muted-foreground rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2">
                                            <Plus size={14} /> Add
                                        </button>
                                    </motion.div>
                                ))}
                            </div>

                            {canScrollRight && (
                                <button
                                    onClick={() => scroll('right')}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white transition-colors"
                                    title="Scroll right"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}

                    {assets.length === 0 && !loading && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground text-sm">No marketplace assets available</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

function getTypeColor(type: string) {
    switch (type.toLowerCase()) {
        case 'character': return 'bg-blue-900/50 text-blue-200'
        case 'mechanic': return 'bg-red-900/50 text-red-200'
        case 'visual': return 'bg-purple-900/50 text-purple-200'
        case 'world': return 'bg-green-900/50 text-green-200'
        default: return 'bg-muted text-muted-foreground'
    }
}
