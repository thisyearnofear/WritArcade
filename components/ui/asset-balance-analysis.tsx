'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'
import { CharacterProfile, GameMechanic, StoryBeat } from '@/domains/games/types'

interface AssetBalanceAnalysisProps {
    characters: CharacterProfile[]
    mechanics: GameMechanic[]
    storyBeats: StoryBeat[]
}

interface BalanceMetric {
    label: string
    current: number
    recommended: { min: number; max: number }
    status: 'good' | 'warning' | 'critical'
    message: string
}

/**
 * Game balance analysis for asset composition
 * Provides guidance on coverage and distribution
 */

export function AssetBalanceAnalysis({
    characters,
    mechanics,
    storyBeats
}: AssetBalanceAnalysisProps) {
    const metrics = useMemo<BalanceMetric[]>(() => {
        const metrics: BalanceMetric[] = []

        // Character count analysis
        const charCount = characters.length
        metrics.push({
            label: 'Characters',
            current: charCount,
            recommended: { min: 2, max: 5 },
            status:
                charCount < 2 ? 'critical' : charCount > 5 ? 'warning' : 'good',
            message:
                charCount < 2
                    ? 'Add at least 2 characters for variety'
                    : charCount > 5
                        ? 'Consider consolidating; 5+ characters may be overwhelming'
                        : 'Balanced character ensemble'
        })

        // Mechanic count analysis
        const mechCount = mechanics.length
        metrics.push({
            label: 'Mechanics',
            current: mechCount,
            recommended: { min: 2, max: 4 },
            status:
                mechCount < 2 ? 'critical' : mechCount > 4 ? 'warning' : 'good',
            message:
                mechCount < 2
                    ? 'Add core mechanics to define gameplay'
                    : mechCount > 4
                        ? 'Too many mechanics; focus on key ones'
                        : 'Good mechanical depth'
        })

        // Story beat analysis
        const beatCount = storyBeats.length
        metrics.push({
            label: 'Story Beats',
            current: beatCount,
            recommended: { min: 3, max: 6 },
            status:
                beatCount < 3
                    ? 'critical'
                    : beatCount > 6
                        ? 'warning'
                        : 'good',
            message:
                beatCount < 3
                    ? 'Minimum 3 beats for narrative arc'
                    : beatCount > 6
                        ? 'Consider streamlining narrative'
                        : 'Solid narrative structure'
        })

        // Character to mechanic ratio
        const charToMechRatio = charCount > 0 ? mechCount / charCount : 0
        metrics.push({
            label: 'Mechanic-to-Character Ratio',
            current: Math.round(charToMechRatio * 100) / 100,
            recommended: { min: 0.5, max: 1.5 },
            status:
                charToMechRatio < 0.5
                    ? 'warning'
                    : charToMechRatio > 1.5
                        ? 'warning'
                        : 'good',
            message:
                charToMechRatio < 0.5
                    ? 'Characters underutilized by mechanics'
                    : charToMechRatio > 1.5
                        ? 'Too many mechanics for available characters'
                        : 'Well-balanced character/mechanic distribution'
        })

        // Narrative coverage
        const beatToCharRatio =
            charCount > 0 ? beatCount / charCount : 0
        metrics.push({
            label: 'Story Coverage',
            current: Math.round(beatToCharRatio * 100) / 100,
            recommended: { min: 1, max: 3 },
            status:
                beatToCharRatio < 1
                    ? 'warning'
                    : beatToCharRatio > 3
                        ? 'critical'
                        : 'good',
            message:
                beatToCharRatio < 1
                    ? 'More story beats needed for narrative depth'
                    : beatToCharRatio > 3
                        ? 'Story may overwhelm character arcs'
                        : 'Story and character arcs align well'
        })

        return metrics
    }, [characters, mechanics, storyBeats])

    const overallStatus = useMemo(() => {
        const counts = {
            critical: metrics.filter(m => m.status === 'critical').length,
            warning: metrics.filter(m => m.status === 'warning').length,
            good: metrics.filter(m => m.status === 'good').length
        }

        return counts.critical > 0 ? 'critical' : counts.warning > 0 ? 'warning' : 'good'
    }, [metrics])

    const statusIcon = {
        good: <CheckCircle className="w-5 h-5 text-green-400" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
        critical: <AlertCircle className="w-5 h-5 text-red-400" />
    }

    const statusColor = {
        good: 'from-green-900/20 to-green-900/5 border-green-700/30',
        warning:
            'from-yellow-900/20 to-yellow-900/5 border-yellow-700/30',
        critical: 'from-red-900/20 to-red-900/5 border-red-700/30'
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-6 border bg-gradient-to-br ${statusColor[overallStatus]}`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                {statusIcon[overallStatus]}
                <div>
                    <h3 className="font-bold text-white">Game Balance Analysis</h3>
                    <p className="text-xs text-muted-foreground">
                        {overallStatus === 'good'
                            ? 'Your asset composition looks balanced'
                            : overallStatus === 'warning'
                                ? 'Some balance issues detected'
                                : 'Critical balance issues found'}
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metrics.map((metric, idx) => (
                    <div
                        key={idx}
                        className="p-3 rounded-lg bg-muted/40 border border-border/50"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-foreground">
                                {metric.label}
                            </span>
                            <span
                                className={`text-lg font-bold ${
                                    metric.status === 'good'
                                        ? 'text-green-400'
                                        : metric.status === 'warning'
                                            ? 'text-yellow-400'
                                            : 'text-red-400'
                                }`}
                            >
                                {metric.current}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${Math.min(
                                        100,
                                        (metric.current / metric.recommended.max) * 100
                                    )}%`
                                }}
                                transition={{ duration: 0.5 }}
                                className={`h-full ${
                                    metric.status === 'good'
                                        ? 'bg-green-500'
                                        : metric.status === 'warning'
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                }`}
                            />
                        </div>

                        {/* Range indicator */}
                        <p className="text-xs text-muted-foreground mb-2">
                            Recommended: {metric.recommended.min}–{metric.recommended.max}
                        </p>

                        {/* Message */}
                        <p className="text-xs text-muted-foreground">{metric.message}</p>
                    </div>
                ))}
            </div>

            {/* Overall Recommendations */}
            <div className="mt-6 pt-6 border-t border-border/50">
                <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Recommendations
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {metrics
                        .filter(m => m.status !== 'good')
                        .map((metric, idx) => (
                            <li
                                key={idx}
                                className="flex items-start gap-2 text-muted-foreground"
                            >
                                <span className="text-lg leading-none mt-0.5">•</span>
                                <span>{metric.message}</span>
                            </li>
                        ))}
                    {metrics.every(m => m.status === 'good') && (
                        <li className="text-green-400 font-medium">
                            ✓ All metrics are well-balanced. Ready to compile!
                        </li>
                    )}
                </ul>
            </div>
        </motion.div>
    )
}
