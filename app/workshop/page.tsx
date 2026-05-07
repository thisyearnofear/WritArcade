'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UndoManager } from '@/lib/undo-manager'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { AssetGenerationResponse } from '@/domains/games/types'
import { Header } from '@/components/layout/header'
import { useOnboarding } from '@/hooks/useOnboarding'
import { RevenueForecast } from '@/components/ui/revenue-forecast'

type WorkshopState = 'input' | 'processing' | 'workshop' | 'compiling' | 'minting'

export default function WorkshopPage() {
    const { showOnboarding, currentStep, flowId, startTour, nextStep, dismissOnboarding } = useOnboarding()
    const { show: showToast } = useToastNotification()
    const [url, setUrl] = useState('')
    const [state, setState] = useState<WorkshopState>('input')
    const [assets, setAssets] = useState<AssetGenerationResponse | null>(null)
    const [undoManager] = useState(() => new UndoManager<AssetGenerationResponse>(15, 'writarcade_workshop_history'))
    const [allChecklistsPassed, setAllChecklistsPassed] = useState(false)

    // Trigger workshop tour on first entry
    useEffect(() => {
        if (state === 'workshop' && !localStorage.getItem('workshop_tour_seen')) {
            startTour('workshop-tour')
            localStorage.setItem('workshop_tour_seen', 'true')
        }
    }, [state, startTour])

    // Hydrate from persisted history on mount
    useEffect(() => {
        const current = undoManager.current()
        if (current && !assets) {
            // Defer state updates to avoid cascading renders
            requestAnimationFrame(() => {
                setAssets(current.state)
                setState('workshop')
            })
        }
    }, [undoManager, assets])

    // Push to undo history when assets change + compute relationships
    useEffect(() => {
        if (assets && state === 'workshop') {
            undoManager.push(assets, 'Asset modified')

            const hasTitle = assets.title.trim().length > 0
            const hasDescription = assets.description.trim().length > 0
            const hasChars = assets.characters.length >= 2
            const hasMechs = assets.gameMechanics.length >= 1
            const hasBeats = assets.storyBeats.length >= 3
            const isPassing = hasTitle && hasDescription && hasChars && hasMechs && hasBeats

            // Defer state updates to avoid cascading renders
            requestAnimationFrame(() => {
                setAllChecklistsPassed(isPassing)
            })
        }
    }, [assets, state, undoManager])

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

    const handleUndo = () => {
        const prev = undoManager.undo()
        if (prev) setAssets(prev.state)
    }

    const renderTour = () => {
        if (!showOnboarding || flowId !== 'workshop-tour') return null
        const steps = [
            "Welcome to the Workshop! This is where you can refine your game assets.",
            "Decomposed assets appear here. You can drag and drop them to organize.",
            "Edit titles, descriptions, and tags. You'll see the provenance snippet here, too.",
            "Once you're ready, look for the 'Register IP' button to mint your game!"
        ]
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="bg-gray-900 border border-purple-500 p-6 rounded-2xl max-w-sm w-full">
                    <h3 className="text-white font-bold mb-2">Workshop Tour ({currentStep + 1}/{steps.length})</h3>
                    <p className="text-gray-300 text-sm mb-6">{steps[currentStep]}</p>
                    <div className="flex justify-between">
                        <button onClick={dismissOnboarding} className="text-gray-500 text-sm hover:text-white">Skip</button>
                        {currentStep < steps.length - 1 ? (
                            <button onClick={nextStep} className="bg-purple-600 px-4 py-2 rounded text-white text-sm">Next</button>
                        ) : (
                            <button onClick={dismissOnboarding} className="bg-green-600 px-4 py-2 rounded text-white text-sm">Got it!</button>
                        )}
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <div className="relative min-h-screen bg-black text-white font-sans">
            {renderTour()}
            <Header />
            <div className="p-4 sm:p-6 lg:p-12">
                <header className="mb-8 max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">
                        Asset Workshop
                    </h1>
                </header>
                
                <div className="max-w-4xl mx-auto">
                    {/* Simplified UI for demonstration */}
                    {state === 'input' && (
                        <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800">
                             <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter article URL..." className="w-full bg-black border border-gray-700 rounded-lg p-3" />
                             <button onClick={handleDecompose} className="mt-4 px-6 py-3 bg-purple-600 rounded-lg font-bold">Decompose</button>
                        </div>
                    )}
                    
                    {state === 'workshop' && assets && (
                        <div className="sticky top-4 z-10 bg-black/80 backdrop-blur p-4 rounded-xl border border-gray-800">
                            <button onClick={handleUndo} disabled={!undoManager.canUndo()} className="mr-2">Undo</button>
                            <button onClick={handleMint} disabled={!allChecklistsPassed} className="bg-green-600 px-4 py-2 rounded">Register IP</button>
                            
                            {allChecklistsPassed && (
                                <div className="mt-4">
                                    <RevenueForecast writerCoinId="avc" action="mint-game" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
