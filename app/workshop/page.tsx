'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UndoManager } from '@/lib/undo-manager'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { ToastContainer } from '@/components/ui/toast-container'
import { AssetCard } from './components/AssetCard'
import { AssetCanvas } from '@/components/ui/asset-canvas'
import { AssetPalette } from '@/components/ui/asset-palette'
import { AssetPresets } from '@/components/ui/asset-presets'
import { AssetBalanceAnalysis } from '@/components/ui/asset-balance-analysis'
import { AssetMintChecklist } from '@/components/ui/asset-mint-checklist'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { BalanceGauge } from '@/components/ui/balance-gauge'
import { SuccessMoment } from '@/components/ui/success-moment'
import { AssetHoverProvider } from '@/components/providers/asset-hover-provider'
import { IPRegistrationFlow } from '@/components/story/IPRegistrationFlow'
import { AssetGenerationResponse, AssetRelationship } from '@/domains/games/types'
import { AssetRelationshipService } from '@/domains/assets/services/asset-relationship.service'
import { AssetEditPanel } from '@/components/ui/asset-edit-panel'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { RotateCcw } from 'lucide-react'
import { Header } from '@/components/layout/header'

type WorkshopState = 'input' | 'processing' | 'workshop' | 'compiling' | 'minting'
type LayoutMode = 'grid' | 'flow'

interface AssetTag {
    key: string
    value: string
}

export default function WorkshopPage() {
    const router = useRouter()
    const { address } = useAccount()
    const { toasts, show: showToast, dismiss } = useToastNotification()
    const [url, setUrl] = useState('')
    const [state, setState] = useState<WorkshopState>('input')
    const [assets, setAssets] = useState<AssetGenerationResponse | null>(null)
    const [isMarketplaceOpen, setMarketplaceOpen] = useState(false)
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
    const [assetTags, setAssetTags] = useState<Record<string, AssetTag[]>>({})
    const [undoManager] = useState(() => new UndoManager<AssetGenerationResponse>(15))
    const [relationships, setRelationships] = useState<AssetRelationship[]>([])
    const [showMintSuccess, setShowMintSuccess] = useState(false)
    const [allChecklistsPassed, setAllChecklistsPassed] = useState(false)
    const [isIPRegistrationModalOpen, setIsIPRegistrationModalOpen] = useState(false)
    // Replaces browser confirm() — stores the pending asset until user confirms or cancels
    const [pendingVisualAsset, setPendingVisualAsset] = useState<{
        id: string; title: string; description: string; type: string; content: unknown
    } | null>(null)

    // Push to undo history when assets change + compute relationships
    useEffect(() => {
        if (assets && state === 'workshop') {
            undoManager.push(assets, 'Asset modified')
            // Recompute relationships whenever assets change
            const rels = AssetRelationshipService.computeRelationships(
                assets.characters,
                assets.gameMechanics,
                assets.storyBeats
            )
            setRelationships(rels)

            // Check if all checklists pass
            const hasTitle = assets.title.trim().length > 0
            const hasDescription = assets.description.trim().length > 0
            const hasChars = assets.characters.length >= 2
            const hasMechs = assets.gameMechanics.length >= 1
            const hasBeats = assets.storyBeats.length >= 3
            const isPassing = hasTitle && hasDescription && hasChars && hasMechs && hasBeats

            if (isPassing && !allChecklistsPassed) {
                setAllChecklistsPassed(true)
                setShowMintSuccess(true)
            } else if (!isPassing && allChecklistsPassed) {
                setAllChecklistsPassed(false)
            }
        }
    }, [assets, state, undoManager, allChecklistsPassed])

    // Handlers
    const handleDecompose = async () => {
        setState('processing')
        try {
            const res = await fetch('/api/assets/generate', {
                method: 'POST',
                body: JSON.stringify({ url }),
            })
            const { data } = await res.json()
            setAssets(data)
            setState('workshop')
        } catch {
            showToast('Failed to extract assets. Try a different article URL.', { type: 'error', duration: 6000 })
            setState('input')
        }
    }

    const handleMint = async () => {
        if (!assets || !address) return
        
        // Open IP registration flow modal instead of alert/confirm
        setIsIPRegistrationModalOpen(true)
    }

    const handleIPRegistrationSuccess = async (_result: unknown) => {
        if (!assets) return
        
        // Log success to console and show toast
        // showToast(`✓ IP Registered! IP ID: ${_result.ipId.slice(0, 10)}...`, {
        //     type: 'success',
        //     duration: 5000,
        // })

        // Optionally: Save the registration result to database
        try {
            await fetch('/api/assets/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetData: {
                        ...assets,
                        title: assets.title || 'Untitled Asset Pack',
                        description: assets.description || 'Generated from ' + url,
                        articleUrl: url,
                        type: 'pack'
                    },
                    // ipId: _result.ipId,
                    // txHash: _result.txHash
                })
            })
        } catch (_e) {
            console.error('Failed to save registration metadata:', _e)
        }
    }

    const handleSave = async (silent = false): Promise<string | null> => {
        if (!assets) return null
        try {
            const res = await fetch('/api/assets/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: assets.title || 'Untitled Asset Pack',
                    description: assets.description || 'Generated from ' + url,
                    content: assets,
                    articleUrl: url
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                if (!silent) showToast('Asset Pack saved to library!', { type: 'success', duration: 3000 })
                return data.data.id // Return the Asset ID
            } else {
                throw new Error('Save failed')
            }
        } catch (e) {
            console.error(e)
            if (!silent) showToast('Error saving assets. Please try again.', { type: 'error', duration: 5000 })
            return null
        }
    }

    const handleCompile = async () => {
        if (!assets) return
        setState('compiling')

        // Convert assets back into a rich prompt
        const assetContext = `
      GAME BLUEPRINT (COMPILED FROM WORKSHOP):
      Title: ${assets.title}
      Description: ${assets.description}
      
      CHARACTERS:
      ${assets.characters.map(c => `- ${c.name} (${c.role}): ${c.personality}`).join('\n')}
      
      MECHANICS:
      ${assets.gameMechanics.map(m => `- ${m.name}: ${m.description}`).join('\n')}
      
      STORY BEATS:
      ${assets.storyBeats.map(b => `- ${b.title}: ${b.description}`).join('\n')}
      
      VISUAL STYLE:
      ${(assets.visualGuidelines?.artStyle || '')}, ${(assets.visualGuidelines?.atmosphere || '')}
    `

        // Call standard game generation with this specific context
        try {
            // Implicitly save the asset pack first to get an ID for tracking
            const assetId = await handleSave(true)

            const res = await fetch('/api/games/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptText: assetContext,
                    promptName: 'Workshop-Compiled-v1',
                    url: url, // We pass original URL for attribution, but prompt is custom
                    assetIds: assetId ? [assetId] : [] // Pass the Asset ID to link valid relationship
                })
            })

            const { data } = await res.json()
            // BUGFIX: Route by slug (not UUID id) — /games/[slug] expects a slug
            if (data && data.slug) {
                router.push(`/games/${data.slug}`)
            } else if (data && data.id) {
                // Fallback if slug is missing (shouldn't happen but guards against 404)
                console.warn('[Workshop] Game missing slug, falling back to id:', data.id)
                router.push(`/games/${data.id}`)
            }
        } catch {
            showToast('Failed to compile game. Please try again.', { type: 'error', duration: 6000 })
            setState('workshop')
        }
    }

    // Workshop Actions
    const removeAsset = (type: 'characters' | 'gameMechanics' | 'storyBeats', index: number) => {
        if (!assets) return
        const newAssets = JSON.parse(JSON.stringify(assets))

        let removed;
        if (type === 'characters') {
            removed = newAssets[type][index]
            newAssets[type] = newAssets[type].filter((_: unknown, i: number) => i !== index)
        } else if (type === 'gameMechanics') {
            removed = newAssets[type][index]
            newAssets[type] = newAssets[type].filter((_: unknown, i: number) => i !== index)
        } else if (type === 'storyBeats') {
            removed = newAssets[type][index]
            newAssets[type] = newAssets[type].filter((_: unknown, i: number) => i !== index)
        }

        // Store previous state for undo
        const previousAssets = assets
        setAssets(newAssets)
        
        // Get removed asset name
        const removedName = (removed as { name?: string; title?: string }).name || (removed as { name?: string; title?: string }).title || 'Item'
        
        // Show toast with undo action
        showToast(`Deleted ${removedName}`, {
            type: 'info',
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    setAssets(previousAssets)
                    showToast('Restored', { type: 'success', duration: 2000 })
                }
            }
        })
    }

    const updateAsset = <K extends 'characters' | 'gameMechanics' | 'storyBeats'>(
        type: K,
        index: number,
        field: string,
        value: string
    ) => {
        if (!assets) return
        const newAssets = JSON.parse(JSON.stringify(assets))

        if (type === 'characters') {
            newAssets[type] = newAssets[type].map((item: Record<string, unknown>, i: number) =>
                i === index ? { ...item, [field]: value } : item
            )
        } else if (type === 'gameMechanics') {
            newAssets[type] = newAssets[type].map((item: Record<string, unknown>, i: number) =>
                i === index ? { ...item, [field]: value } : item
            )
        } else if (type === 'storyBeats') {
            newAssets[type] = newAssets[type].map((item: Record<string, unknown>, i: number) =>
                i === index ? { ...item, [field]: value } : item
            )
        }
        setAssets(newAssets)
    }

    const updateAssetTags = (type: 'characters' | 'gameMechanics' | 'storyBeats', index: number, tags: AssetTag[]) => {
        if (!assets) return
        const key = `${type}-${index}`
        setAssetTags({ ...assetTags, [key]: tags })
    }

    const getAssetTags = (type: 'characters' | 'gameMechanics' | 'storyBeats', index: number): AssetTag[] => {
        const key = `${type}-${index}`
        return assetTags[key] || []
    }

    const handleUndo = () => {
        const previous = undoManager.undo()
        if (previous) {
            setAssets(previous.state)
            showToast('Undone', { type: 'success', duration: 2000 })
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Cmd+Z or Ctrl+Z for undo
            if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey && state === 'workshop') {
                event.preventDefault()
                handleUndo()
            }
            // Escape to close marketplace
            if (event.key === 'Escape' && isMarketplaceOpen) {
                setMarketplaceOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [state, isMarketplaceOpen, undoManager])

    const handleInject = (asset: { id: string, title: string, description: string, type: string, content: unknown }) => {
        if (!assets) return
        const newAssets = { ...assets }
        const type = asset.type.toLowerCase()

        if (type === 'mechanic') {
            newAssets.gameMechanics.push(asset.content as import('@/domains/games/types').GameMechanic)
        } else if (type === 'character') {
            newAssets.characters.push(asset.content as import('@/domains/games/types').CharacterProfile)
        } else if (type === 'visual' || type === 'world') {
            // P0 FIX: replace browser confirm() with state-based confirmation banner
            // Store the pending asset; the user approves/cancels via the UI below
            setPendingVisualAsset(asset)
            setMarketplaceOpen(false)
            return // Don't apply yet — wait for confirmation
        } else {
            console.log("Unknown asset type", type)
        }

        setAssets(newAssets)
        setMarketplaceOpen(false)
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Global navigation header — consistent with rest of web app */}
            <Header />

            <div className="p-4 sm:p-6 lg:p-12">
            <header className="mb-8 max-w-4xl mx-auto animate-slide-in">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-writersarcade-primary to-writersarcade-accent bg-clip-text text-transparent mb-2">
                    Asset Workshop
                </h1>
                <p className="text-gray-400">
                    Decompose articles into component IP assets. Remix, edit, and compile custom games.
                </p>
            </header>

            <div className="max-w-4xl mx-auto">
                {state === 'input' && (
                    <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Article URL</label>
                        <div className="flex gap-4">
                            <input
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="https://paragraph.xyz/@author/article-title"
                                className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            />
                            <button
                                onClick={handleDecompose}
                                disabled={!url}
                                className="px-6 py-3 bg-writersarcade-primary hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-colors btn-enhanced mobile"
                            >
                                Decompose
                            </button>
                        </div>
                    </div>
                )}

                {(state === 'processing' || state === 'compiling' || state === 'minting') && (
                    <div className="text-center py-20">
                        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                        <p className="text-xl font-medium animate-pulse">
                            {state === 'processing' ? 'Extracting IP Assets...' : state === 'minting' ? 'Minting Logic on Story Protocol...' : 'Compiling Game Runtime...'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {state === 'processing' ? 'Analyzing themes, extracting characters, identifying mechanics' : state === 'minting' ? 'hashing metadata • uploading to IPFS • confirming on-chain' : 'Synthesizing story engine from selected assets'}
                        </p>
                    </div>
                )}

                {state === 'workshop' && assets && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                        {/* Toolbar — responsive: wraps on < lg to avoid overflow */}
                        <div className="mb-8 sticky top-4 z-10 bg-black/80 backdrop-blur p-3 sm:p-4 rounded-xl border border-gray-800/50 shadow-xl">
                            {/* Title row */}
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold truncate">{assets.title}</h2>
                                    <p className="text-xs text-gray-400">
                                        {assets.characters.length + assets.gameMechanics.length + assets.storyBeats.length} Assets
                                    </p>
                                </div>
                                <BalanceGauge
                                    characters={assets.characters}
                                    mechanics={assets.gameMechanics}
                                    storyBeats={assets.storyBeats}
                                />
                            </div>
                            {/* Action buttons — flex-wrap so they stack on narrow screens */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleUndo}
                                    disabled={!undoManager.canUndo()}
                                    title="Undo (Cmd+Z)"
                                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 border border-gray-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Undo</span>
                                </button>
                                <AssetPresets currentAssets={assets} onLoadPreset={setAssets} />
                                <button
                                    onClick={() => handleSave(false)}
                                    className="px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-700/50 rounded-lg text-xs font-bold transition-all"
                                >
                                    Save Draft
                                </button>
                                <button
                                    onClick={() => setMarketplaceOpen(true)}
                                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                    <span>+</span>
                                    <span className="hidden sm:inline">Add Asset</span>
                                </button>
                                {/* Critical actions pushed to end */}
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={handleMint}
                                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                    >
                                        <span>✦</span>
                                        <span className="hidden sm:inline">Mint IP</span>
                                    </button>
                                    <button
                                        onClick={handleCompile}
                                        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Compile Game
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Visual Style Confirmation Banner — replaces browser confirm() */}
                        {pendingVisualAsset && (
                            <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-900/20 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <div className="flex-1 text-sm">
                                    <span className="font-semibold text-amber-300">Replace visual style</span>
                                    <span className="text-amber-200/80"> with &ldquo;{pendingVisualAsset.title}&rdquo;?</span>
                                    <p className="text-xs text-amber-200/60 mt-0.5">This will overwrite the current visual guidelines.</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => {
                                            if (!assets) return
                                            setAssets({
                                                ...assets,
                                                visualGuidelines: {
                                                    ...assets.visualGuidelines,
                                                    ...(pendingVisualAsset.content as import('@/domains/games/types').VisualGuideline)
                                                }
                                            })
                                            setPendingVisualAsset(null)
                                            showToast('Visual style applied', { type: 'success', duration: 2000 })
                                        }}
                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg"
                                    >
                                        Replace
                                    </button>
                                    <button
                                        onClick={() => setPendingVisualAsset(null)}
                                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Analysis Section */}
                        <div className="space-y-4">
                            <CollapsibleSection
                                title="✓ Mint Readiness"
                                defaultOpen={false}
                            >
                                <AssetMintChecklist
                                    title={assets.title}
                                    description={assets.description}
                                    characters={assets.characters}
                                    mechanics={assets.gameMechanics}
                                    storyBeats={assets.storyBeats}
                                />
                            </CollapsibleSection>
                            <CollapsibleSection
                                title="⚖ Game Balance"
                                defaultOpen={false}
                            >
                                <AssetBalanceAnalysis
                                    characters={assets.characters}
                                    mechanics={assets.gameMechanics}
                                    storyBeats={assets.storyBeats}
                                />
                            </CollapsibleSection>
                        </div>

                        {/* Asset Canvas Grid with Hover Provider */}
                        <AssetHoverProvider
                            relationships={relationships}
                        >
                        <div className="space-y-12">

                            {/* Characters Canvas */}
                            <AssetCanvas
                                sectionTitle={`Characters (${assets.characters.length})`}
                                sectionColor="blue"
                                layoutMode={layoutMode}
                                onLayoutModeChange={setLayoutMode}
                                assets={assets.characters.map((char, i) => ({
                                    id: `char-${i}`,
                                    title: char.name,
                                    type: 'character' as const,
                                    component: (
                                        <AssetCard
                                            title={char.name}
                                            type="Character"
                                            assetType="character"
                                            assetIndex={i}
                                            tags={getAssetTags('characters', i)}
                                            onDelete={() => removeAsset('characters', i)}
                                            onTitleChange={(newName) => updateAsset('characters', i, 'name', newName)}
                                            onTagsChange={(tags) => updateAssetTags('characters', i, tags)}
                                        >
                                            {/* Enhanced with AssetEditPanel for character customization */}
                                            <AssetEditPanel
                                                title={char.name}
                                                description={char.personality}
                                                tags={getAssetTags('characters', i)}
                                                onTitleChange={(newName) => updateAsset('characters', i, 'name', newName)}
                                                onDescriptionChange={(newDesc) => updateAsset('characters', i, 'personality', newDesc)}
                                                onTagsChange={(tags) => updateAssetTags('characters', i, tags)}
                                                characterData={{
                                                    name: char.name,
                                                    role: char.role,
                                                    personality: char.personality,
                                                    appearance: char.appearance,
                                                    customizationOptions: [
                                                        {
                                                            category: 'hair',
                                                            options: ['Short', 'Long', 'Bald', 'Curly', 'Straight'],
                                                            current: 'Short'
                                                        },
                                                        {
                                                            category: 'clothing',
                                                            options: ['Casual', 'Formal', 'Fantasy', 'Sci-Fi', 'Historical'],
                                                            current: 'Casual'
                                                        },
                                                        {
                                                            category: 'expression',
                                                            options: ['Happy', 'Serious', 'Angry', 'Sad', 'Neutral'],
                                                            current: 'Neutral'
                                                        }
                                                    ]
                                                }}
                                                onCharacterUpdate={(updates) => {
                                                    if (updates.customization) {
                                                        // In a real implementation, this would update the character's visual appearance
                                                        console.log('Character customization updated:', updates.customization)
                                                    }
                                                }}
                                            />
                                        </AssetCard>
                                    )
                                }))}
                            />

                            {/* Mechanics Canvas */}
                            <AssetCanvas
                                sectionTitle={`Mechanics (${assets.gameMechanics.length})`}
                                sectionColor="red"
                                layoutMode={layoutMode}
                                assets={assets.gameMechanics.map((mech, i) => ({
                                    id: `mech-${i}`,
                                    title: mech.name,
                                    type: 'mechanic' as const,
                                    component: (
                                        <AssetCard
                                            title={mech.name}
                                            type="Mechanic"
                                            assetType="mechanic"
                                            assetIndex={i}
                                            tags={getAssetTags('gameMechanics', i)}
                                            onDelete={() => removeAsset('gameMechanics', i)}
                                            onTitleChange={(newName) => updateAsset('gameMechanics', i, 'name', newName)}
                                            onTagsChange={(tags) => updateAssetTags('gameMechanics', i, tags)}
                                        >
                                            <p className="text-sm text-gray-300 mb-2">{mech.description}</p>
                                            <p className="text-xs text-gray-500 font-mono bg-gray-900 p-2 rounded block">
                                                {mech.consequence}
                                            </p>
                                        </AssetCard>
                                    )
                                }))}
                            />

                            {/* Story Beats Canvas */}
                            <AssetCanvas
                                sectionTitle={`Story Beats (${assets.storyBeats.length})`}
                                sectionColor="yellow"
                                layoutMode={layoutMode}
                                assets={assets.storyBeats.map((beat, i) => ({
                                    id: `beat-${i}`,
                                    title: beat.title,
                                    type: 'story' as const,
                                    component: (
                                        <AssetCard
                                            title={beat.title}
                                            type="Story"
                                            assetType="story"
                                            assetIndex={i}
                                            tags={getAssetTags('storyBeats', i)}
                                            onDelete={() => removeAsset('storyBeats', i)}
                                            onTitleChange={(newTitle) => updateAsset('storyBeats', i, 'title', newTitle)}
                                            onTagsChange={(tags) => updateAssetTags('storyBeats', i, tags)}
                                        >
                                            <p className="text-sm text-gray-300">{beat.description}</p>
                                        </AssetCard>
                                    )
                                }))}
                            />

                        </div>
                        </AssetHoverProvider>
                    </motion.div>
                )}

                <AssetPalette
                    isOpen={isMarketplaceOpen}
                    onClose={() => setMarketplaceOpen(false)}
                    onInject={handleInject}
                />
            </div>

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />

            {/* Success moment */}
            <SuccessMoment
                trigger={showMintSuccess}
                onComplete={() => setShowMintSuccess(false)}
            />

            {/* IP Registration Flow Modal */}
            {assets && address && (
                <IPRegistrationFlow
                    isOpen={isIPRegistrationModalOpen}
                    context={{
                        assetTitle: assets.title || 'Untitled Asset Pack',
                        assetDescription: assets.description || 'Generated asset pack',
                        articleUrl: url,
                        genre: (assets.visualGuidelines?.artStyle?.includes('horror') ? 'horror' : 'comedy') as 'horror' | 'comedy' | 'mystery',
                        difficulty: 'hard',
                        authorUsername: 'Anonymous',
                        authorWalletAddress: address,
                    }}
                    onClose={() => setIsIPRegistrationModalOpen(false)}
                />
            )}
            </div>{/* end p-4 sm:p-6 lg:p-12 */}
        </div>
    )
}
