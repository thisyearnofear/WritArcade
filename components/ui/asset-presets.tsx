'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Upload, Save, Trash2, ChevronDown } from 'lucide-react'
import { AssetPresetsService, CompositionPreset } from '@/domains/assets/services/asset-presets.service'
import { AssetGenerationResponse } from '@/domains/games/types'

interface AssetPresetsProps {
    currentAssets: AssetGenerationResponse
    onLoadPreset: (assets: AssetGenerationResponse) => void
}

/**
 * Asset Composition Presets UI
 * Save, load, import, export configurations
 */
export function AssetPresets({ currentAssets, onLoadPreset }: AssetPresetsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [presets, setPresets] = useState<CompositionPreset[]>([])
    const [saveMode, setSaveMode] = useState(false)
    const [presetName, setPresetName] = useState('')
    const [presetDescription, setPresetDescription] = useState('')
    const [_mergeMode, _setMergeMode] = useState<'replace' | 'merge'>('replace')

    const loadPresets = () => {
        const loaded = AssetPresetsService.getAllPresetsLocally()
        setPresets(loaded)
    }

    useEffect(() => {
        loadPresets()
    }, [])

    const handleSavePreset = () => {
        if (!presetName.trim()) return

        const preset = AssetPresetsService.createPreset(
            currentAssets,
            presetName,
            presetDescription,
            false
        )

        if (AssetPresetsService.savePresetLocally(preset)) {
            loadPresets()
            setPresetName('')
            setPresetDescription('')
            setSaveMode(false)
        }
    }

    const handleLoadPreset = (preset: CompositionPreset) => {
        const applied = AssetPresetsService.applyPreset(currentAssets, preset, 'replace')
        onLoadPreset(applied)
        setIsOpen(false)
    }

    const handleDeletePreset = (presetId: string) => {
        if (confirm('Delete this preset?')) {
            AssetPresetsService.deletePresetLocally(presetId)
            loadPresets()
        }
    }

    const handleExportPreset = (preset: CompositionPreset) => {
        AssetPresetsService.exportPreset(preset)
    }

    const handleImportPreset = async (file: File) => {
        const imported = await AssetPresetsService.importPreset(file)
        if (imported) {
            AssetPresetsService.savePresetLocally(imported)
            loadPresets()
        }
    }

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-700/50 rounded-lg text-sm font-bold transition-all"
            >
                <span>Presets</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
                            {/* Save new preset */}
                            {!saveMode ? (
                                <button
                                    onClick={() => setSaveMode(true)}
                                    className="w-full py-2 bg-green-900/30 hover:bg-green-900/50 text-green-200 border border-green-700/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Current
                                </button>
                            ) : (
                                <div className="space-y-2 p-3 bg-gray-900 rounded-lg border border-green-700/30">
                                    <input
                                        type="text"
                                        placeholder="Preset name"
                                        value={presetName}
                                        onChange={(e) => setPresetName(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                        autoFocus
                                    />
                                    <textarea
                                        placeholder="Description (optional)"
                                        value={presetDescription}
                                        onChange={(e) => setPresetDescription(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none min-h-[50px]"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSavePreset}
                                            className="flex-1 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setSaveMode(false)}
                                            className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs font-bold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Import/Export */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800">
                                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-300 border border-blue-700/30 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                                    <Upload className="w-3 h-3" /> Import
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleImportPreset(file)
                                        }}
                                        className="hidden"
                                    />
                                </label>
                                {presets.length > 0 && (
                                    <button
                                        onClick={() => handleExportPreset(presets[0])}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-900/20 hover:bg-purple-900/40 text-purple-300 border border-purple-700/30 rounded-lg text-xs font-medium transition-colors"
                                        title="Export first preset"
                                    >
                                        <Download className="w-3 h-3" /> Export
                                    </button>
                                )}
                            </div>

                            {/* Presets list */}
                            {presets.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-gray-800">
                                    {presets.map((preset) => (
                                        <div
                                            key={preset.id}
                                            className="p-3 bg-gray-900/50 hover:bg-gray-900 border border-gray-800/50 hover:border-purple-500/30 rounded-lg transition-all group"
                                        >
                                            <h4 className="font-bold text-gray-200 text-sm mb-1">{preset.name}</h4>
                                            {preset.description && (
                                                <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                                                    {preset.description}
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleLoadPreset(preset)}
                                                    className="flex-1 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition-colors"
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    onClick={() => handleExportPreset(preset)}
                                                    className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                                                    title="Export"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePreset(preset.id)}
                                                    className="px-2 py-1 bg-red-900/20 hover:bg-red-900/40 text-red-300 rounded text-xs transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {presets.length === 0 && !saveMode && (
                                <p className="text-xs text-gray-400 text-center py-4">No presets saved yet</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
