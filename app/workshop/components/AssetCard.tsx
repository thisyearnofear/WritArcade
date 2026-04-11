'use client'

import { motion } from 'framer-motion'
import { AssetEditPanel } from '@/components/ui/asset-edit-panel'
import { useAssetHover } from '@/contexts/asset-hover.context'

interface AssetTag {
    key: string
    value: string
}

interface AssetCardProps {
    title: string
    type: string
    assetType?: 'character' | 'mechanic' | 'story'
    assetIndex?: number
    description?: string
    sourceSnippet?: string
    tags?: AssetTag[]
    children: React.ReactNode
    onDelete: () => void
    onTitleChange?: (newTitle: string) => void
    onDescriptionChange?: (newDescription: string) => void
    onTagsChange?: (newTags: AssetTag[]) => void
    editable?: boolean
}

export function AssetCard({
    title,
    type,
    assetType,
    assetIndex,
    description,
    sourceSnippet,
    tags = [],
    children,
    onDelete,
    onTitleChange,
    onDescriptionChange,
    onTagsChange,
    editable = true
}: AssetCardProps) {
    const { hoveredAsset, relatedAssets, setHoveredAsset } = useAssetHover()
    const isHovered = hoveredAsset?.type === assetType && hoveredAsset?.index === assetIndex
    const isRelated = relatedAssets.some(a => a.type === assetType && a.index === assetIndex)
    const isFaded = hoveredAsset && !isHovered && !isRelated

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onMouseEnter={() => {
                if (assetType && assetIndex !== undefined) {
                    setHoveredAsset({ type: assetType, index: assetIndex })
                }
            }}
            onMouseLeave={() => setHoveredAsset(null)}
            className={`card-enhanced relative group transition-all ${
                isHovered
                    ? 'border-writersarcade-primary bg-writersarcade-primary/10 ring-2 ring-writersarcade-primary/30'
                    : isRelated
                        ? 'border-writersarcade-primary/50 bg-writersarcade-primary/10'
                        : isFaded
                            ? 'border-gray-700/30 bg-gray-800/20 opacity-40'
                            : 'border-gray-700/50 hover:border-writersarcade-primary/30 hover:bg-gray-800/60'
            }`}
        >
            {/* Type Badge */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider bg-gray-900 text-gray-400 px-2 py-1 rounded flex-shrink-0">
                    {type}
                </span>
            </div>

            {/* Edit Panel (consolidated title, description, tags) */}
            <div className="mb-4">
                <AssetEditPanel
                    title={title}
                    description={description}
                    tags={tags}
                    editable={editable}
                    onTitleChange={onTitleChange}
                    onDescriptionChange={onDescriptionChange}
                    onTagsChange={onTagsChange}
                />
                {sourceSnippet && (
                    <div className="mt-2 text-[10px] text-gray-500 italic border-l-2 border-gray-700 pl-2">
                        <span className="font-bold text-gray-400">Provenance:</span> {sourceSnippet}
                    </div>
                )}
            </div>

            {/* Asset-specific content */}
            <div className="text-gray-300 mb-4">
                {children}
            </div>

            {/* Delete button */}
            <button
                onClick={onDelete}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Delete asset"
            >
                ×
            </button>
        </motion.div>
    )
}

