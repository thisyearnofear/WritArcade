'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Grid3x3, Layout } from 'lucide-react'

interface CanvasAsset {
    id: string | number
    title: string
    type: 'character' | 'mechanic' | 'story'
    component: React.ReactNode
}

interface AssetCanvasProps {
    assets: CanvasAsset[]
    onReorder?: (newOrder: CanvasAsset[]) => void
    layoutMode?: 'grid' | 'flow'
    onLayoutModeChange?: (mode: 'grid' | 'flow') => void
    sectionTitle?: string
    sectionColor?: string
}

export function AssetCanvas({
    assets,
    onReorder,
    layoutMode = 'grid',
    onLayoutModeChange,
    sectionTitle,
    sectionColor = 'gray'
}: AssetCanvasProps) {
    const [localAssets, setLocalAssets] = useState(assets)
    const [isDragging, setIsDragging] = useState(false)

    // Update local state when props change
    if (JSON.stringify(localAssets.map(a => a.id)) !== JSON.stringify(assets.map(a => a.id))) {
        setLocalAssets(assets)
    }

    const handleReorder = useCallback((newOrder: CanvasAsset[]) => {
        setLocalAssets(newOrder)
        onReorder?.(newOrder)
    }, [onReorder])

    const colorMap = {
        blue: 'border-blue-500/30 hover:border-blue-500/50',
        red: 'border-red-500/30 hover:border-red-500/50',
        yellow: 'border-yellow-500/30 hover:border-yellow-500/50',
        purple: 'border-purple-500/30 hover:border-purple-500/50',
        gray: 'border-border/30 hover:border-border/50'
    }

    const colorClass = colorMap[sectionColor as keyof typeof colorMap] || colorMap.gray

    return (
        <div className="space-y-4">
            {/* Canvas Header */}
            {(sectionTitle || onLayoutModeChange) && (
                <div className="flex justify-between items-center">
                    {sectionTitle && (
                        <h3 className="text-muted-foreground text-sm font-bold tracking-wider uppercase flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full bg-${sectionColor}-500`}></span>
                            {sectionTitle}
                        </h3>
                    )}
                    {onLayoutModeChange && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onLayoutModeChange('grid')}
                                title="Grid layout"
                                className={`p-2 rounded transition-colors ${
                                    layoutMode === 'grid'
                                        ? 'bg-purple-600/20 text-purple-400'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                                }`}
                            >
                                <Grid3x3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onLayoutModeChange('flow')}
                                title="Flow layout"
                                className={`p-2 rounded transition-colors ${
                                    layoutMode === 'flow'
                                        ? 'bg-purple-600/20 text-purple-400'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'
                                }`}
                            >
                                <Layout className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Canvas Container */}
            <Reorder.Group
                axis="y"
                values={localAssets}
                onReorder={handleReorder}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                className={`space-y-0 p-4 rounded-2xl border-2 ${colorClass} bg-muted/20 transition-all ${
                    isDragging ? 'bg-purple-900/10 border-purple-500/50' : ''
                }`}
            >
                {layoutMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                            {localAssets.map((asset) => (
                                <Reorder.Item key={asset.id} value={asset} className="cursor-grab active:cursor-grabbing">
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        {asset.component}
                                    </motion.div>
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {localAssets.map((asset) => (
                                <Reorder.Item key={asset.id} value={asset} className="cursor-grab active:cursor-grabbing">
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        {asset.component}
                                    </motion.div>
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </Reorder.Group>

            {/* Empty state */}
            {localAssets.length === 0 && (
                <div className="p-8 rounded-2xl border-2 border-dashed border-border/50 text-center">
                    <p className="text-muted-foreground text-sm">No assets in this section. Add some to get started.</p>
                </div>
            )}
        </div>
    )
}
