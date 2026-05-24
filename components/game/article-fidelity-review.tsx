'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Zap } from 'lucide-react'

interface ArticleFidelityReviewProps {
  isOpen: boolean
  game: {
    id: string
    title: string
    description: string
    slug: string
    imageUrl?: string
  }
  articleUrl?: string
  fidelityScore?: number // 0-100
  onApprove: () => void
  onReject?: () => void
  isLoading?: boolean
}

export function ArticleFidelityReview({
  isOpen,
  game,
  articleUrl,
  fidelityScore,
  onApprove,
  onReject,
  isLoading = false,
}: ArticleFidelityReviewProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/games/${game.slug}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      
      if (response.ok) {
        onApprove()
      }
    } catch (error) {
      console.error('Error approving game:', error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      const response = await fetch(`/api/games/${game.slug}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: 'Creator rejected game' }),
      })
      
      if (response.ok) {
        onReject?.()
      }
    } catch (error) {
      console.error('Error rejecting game:', error)
    } finally {
      setIsRejecting(false)
    }
  }

  const getMatchQuality = (score?: number) => {
    if (!score) return null
    if (score >= 80) return { label: 'Highly Aligned', color: 'from-emerald-500 to-teal-500', icon: '✓' }
    if (score >= 60) return { label: 'Good Match', color: 'from-blue-500 to-cyan-500', icon: '✓' }
    if (score >= 40) return { label: 'Partial Match', color: 'from-amber-500 to-orange-500', icon: '!' }
    return { label: 'Poor Match', color: 'from-red-500 to-pink-500', icon: '✗' }
  }

  const quality = getMatchQuality(fidelityScore)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-muted/95 backdrop-blur border-b border-border p-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Verify Game Authenticity
                </h2>
                <p className="text-muted-foreground text-sm">
                  Make sure your game truly captures the article's essence
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Fidelity Score */}
                {quality && (
                  <motion.div
                    className={`bg-gradient-to-r ${quality.color} rounded-xl p-6 text-white shadow-lg`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl font-bold">{quality.icon}</div>
                      <div>
                        <p className="text-sm font-semibold opacity-90">Theme Alignment</p>
                        <h3 className="text-2xl font-bold">{quality.label}</h3>
                        <p className="text-sm opacity-80 mt-1">
                          {fidelityScore?.toFixed(0)}% semantic match with article themes
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                  {/* Game Preview */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Generated Game
                    </h4>
                    <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                      {game.imageUrl && (
                        <img
                          src={game.imageUrl}
                          alt={game.title}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Title</p>
                        <p className="text-white font-medium text-lg">{game.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-muted-foreground text-sm">{game.description}</p>
                      </div>
                      {articleUrl && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Source Article</p>
                          <a
                            href={articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm underline truncate"
                          >
                            View original article
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                    <p className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Quality Check
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Game captures article themes
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Narrative aligns with source material
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Ready for gameplay and minting
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-muted/95 backdrop-blur border-t border-border p-6 flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={isRejecting || isLoading}
                  className="flex-1 px-4 py-3 rounded-lg border border-red-600 text-red-300 hover:text-red-200 hover:border-red-500 hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isLoading}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isApproving ? 'Approving...' : 'Approve & Continue'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
