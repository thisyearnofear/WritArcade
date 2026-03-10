'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Image as ImageIcon, LayoutPanelTop, Loader2 } from 'lucide-react'
import { Game } from '@/domains/games/types'

interface StoryboardPanel {
  title: string
  description: string
  imagePrompt: string
  previewImage?: string
}

interface NarrativePreviewModalProps {
  isOpen: boolean
  game: Game
  firstPanelNarrative?: string
  firstPanelOptions?: Array<{ id: number; text: string }>
  onClose: () => void
  onStart: () => void
  isLoading?: boolean
  // Enhanced with visual storyboard data
  storyboardPanels?: StoryboardPanel[]
}

export function NarrativePreviewModal({
  isOpen,
  game,
  firstPanelNarrative,
  firstPanelOptions = [],
  onClose,
  onStart,
  isLoading = false,
  storyboardPanels,
}: NarrativePreviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gray-800/95 backdrop-blur border-b border-gray-700 p-6 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {game.title}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {game.genre} • {game.subgenre} • ~15 min
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Game Description */}
                <div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {game.description}
                  </p>
                  {game.tagline && (
                    <p className="text-gray-400 text-sm italic mt-3 border-l-2 border-purple-500 pl-3">
                      "{game.tagline}"
                    </p>
                  )}
                </div>

                {/* First Panel Preview */}
                {firstPanelNarrative && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Opening Scene
                    </h3>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <p className="text-gray-100 leading-relaxed">
                        {firstPanelNarrative}
                      </p>
                    </div>
                  </div>
                )}

                {/* Visual Storyboard - Enhanced Feature */}
                {storyboardPanels && storyboardPanels.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <LayoutPanelTop className="w-5 h-5 text-purple-400" />
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                        Visual Storyboard
                      </h3>
                      <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                        {storyboardPanels.length} panels
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {storyboardPanels.map((panel: StoryboardPanel, index: number) => (
                        <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400 bg-gray-700 px-2 py-1 rounded">
                              Panel {index + 1}
                            </span>
                            {panel.previewImage ? (
                              <ImageIcon className="w-4 h-4 text-green-400" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <h4 className="font-medium text-gray-100 text-sm truncate">
                            {panel.title}
                          </h4>
                          <p className="text-gray-400 text-xs line-clamp-2">
                            {panel.description}
                          </p>
                          {panel.previewImage && (
                            <div className="aspect-video bg-gray-700 rounded overflow-hidden">
                              <img
                                src={panel.previewImage}
                                alt={panel.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <p className="text-gray-500 text-xs italic line-clamp-1">
                            {panel.imagePrompt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Your Choices */}
                {firstPanelOptions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                      Your First Choice
                    </h3>
                    <div className="space-y-2">
                      {firstPanelOptions.slice(0, 4).map((option) => (
                        <div
                          key={option.id}
                          className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 text-gray-300 text-sm hover:border-purple-500/50 hover:bg-gray-800/50 transition-all"
                        >
                          <span className="text-purple-400 font-semibold">
                            {option.id}.
                          </span>{' '}
                          {option.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-700">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Panels
                    </p>
                    <p className="text-white font-bold text-lg">5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Time
                    </p>
                    <p className="text-white font-bold text-lg">10-15m</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs uppercase tracking-wide">
                      Genre
                    </p>
                    <p className="text-white font-bold text-lg text-xs">
                      {game.genre}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-gray-800/95 backdrop-blur border-t border-gray-700 p-6 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-all font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={onStart}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-3 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 ${isLoading 
                    ? 'bg-purple-700 cursor-wait animate-pulse' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:scale-[1.02] active:scale-[0.98]'
                  } disabled:opacity-70`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Crafting your story...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start Playing</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
