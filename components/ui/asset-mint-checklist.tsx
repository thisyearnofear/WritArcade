'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Lock, Unlock } from 'lucide-react'
import { CharacterProfile, GameMechanic, StoryBeat } from '@/domains/games/types'

interface AssetMintChecklistProps {
    title: string
    description: string
    characters: CharacterProfile[]
    mechanics: GameMechanic[]
    storyBeats: StoryBeat[]
}

interface ChecklistItem {
    id: string
    label: string
    passed: boolean
    requirement: string
    category: 'critical' | 'optional'
}

/**
 * Pre-mint validation checklist
 * Ensures asset pack is ready for Story Protocol registration
 * 
 * Returns: { checklist, canMint, criticalPassed }
 */
export function AssetMintChecklist({
    title,
    description,
    characters,
    mechanics,
    storyBeats
}: AssetMintChecklistProps) {
    const checklist = useMemo<ChecklistItem[]>(() => {
        return [
            {
                id: 'title',
                label: 'Has Title',
                passed: title.trim().length > 0,
                requirement: 'Provide a clear, descriptive title',
                category: 'critical'
            },
            {
                id: 'description',
                label: 'Has Description',
                passed: description.trim().length > 0,
                requirement: 'Add a brief description of the asset pack',
                category: 'critical'
            },
            {
                id: 'characters',
                label: 'Has Characters',
                passed: characters.length >= 2,
                requirement: `At least 2 characters (you have ${characters.length})`,
                category: 'critical'
            },
            {
                id: 'mechanics',
                label: 'Has Mechanics',
                passed: mechanics.length >= 1,
                requirement: `At least 1 mechanic (you have ${mechanics.length})`,
                category: 'critical'
            },
            {
                id: 'story',
                label: 'Has Story Beats',
                passed: storyBeats.length >= 3,
                requirement: `At least 3 story beats (you have ${storyBeats.length})`,
                category: 'critical'
            },
            {
                id: 'balanced',
                label: 'Balanced Composition',
                passed: characters.length > 0 && mechanics.length > 0 && storyBeats.length >= 3,
                requirement: 'Characters, mechanics, and story should be proportionate',
                category: 'optional'
            }
        ]
    }, [title, description, characters.length, mechanics.length, storyBeats.length])

    const criticalItems = checklist.filter(item => item.category === 'critical')
    const optionalItems = checklist.filter(item => item.category === 'optional')
    const criticalPassed = criticalItems.every(item => item.passed)

    const canMint = criticalPassed

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-6 border bg-gradient-to-br from-purple-900/20 to-purple-900/5 border-purple-700/30"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                {canMint ? (
                    <Unlock className="w-5 h-5 text-green-400" />
                ) : (
                    <Lock className="w-5 h-5 text-amber-400" />
                )}
                <div>
                    <h3 className="font-bold text-white">Mint Readiness</h3>
                    <p className="text-xs text-muted-foreground">
                        {canMint
                            ? 'Your asset pack is ready to mint!'
                            : 'Complete requirements below to enable minting'}
                    </p>
                </div>
            </div>

            {/* Critical Items */}
            {criticalItems.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Required
                    </h4>
                    <div className="space-y-2">
                        {criticalItems.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
                            >
                                {item.passed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${item.passed ? 'text-green-400' : 'text-red-400'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{item.requirement}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Optional Items */}
            {optionalItems.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Recommended
                    </h4>
                    <div className="space-y-2">
                        {optionalItems.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors"
                            >
                                {item.passed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${item.passed ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{item.requirement}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        {checklist.filter(item => item.passed).length} of {checklist.length} checks passed
                    </span>
                    {canMint && (
                        <span className="text-xs font-bold text-green-400 px-3 py-1 bg-green-900/20 border border-green-700/50 rounded-full">
                            Ready to Mint ✓
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
