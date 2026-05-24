'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp } from 'lucide-react'

interface PostGameFeedbackProps {
  _gameId?: string
  onSubmit?: (feedback: { npsScore: number; comment?: string }) => Promise<void>
  onSkip?: () => void
}

export function PostGameFeedback({
  _gameId,
  onSubmit,
  onSkip,
}: PostGameFeedbackProps) {
  const [step, setStep] = useState<'nps' | 'comment' | 'success'>('nps')
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleNpsSelect = (score: number) => {
    setNpsScore(score)
  }

  const handleNext = async () => {
    if (npsScore === null) return

    if (step === 'nps') {
      setStep('comment')
    } else if (step === 'comment') {
      setIsSubmitting(true)
      try {
        await onSubmit?.({
          npsScore,
          comment: comment.trim() || undefined,
        })
        setStep('success')
      } catch (error) {
        console.error('Failed to submit feedback:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleSkip = () => {
    onSkip?.()
  }

  return (
    <AnimatePresence mode="wait">
      {step === 'nps' && (
        <motion.div
          key="nps"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-br from-card to-muted border border-border rounded-2xl p-8 max-w-md mx-auto"
        >
          <h3 className="text-2xl font-bold text-white mb-2">How was your experience?</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Would you recommend this game to a friend?
          </p>

          <div className="space-y-3 mb-8">
            {[
              { score: 10, label: '😍 Absolutely! Loved it', color: 'from-emerald-500 to-teal-500' },
              { score: 7, label: '👍 Yes, pretty good', color: 'from-blue-500 to-cyan-500' },
              { score: 5, label: '😐 It was okay', color: 'from-amber-500 to-orange-500' },
              { score: 0, label: '👎 Not really', color: 'from-red-500 to-pink-500' },
            ].map(({ score, label, color }) => (
              <motion.button
                key={score}
                onClick={() => handleNpsSelect(score)}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  npsScore === score
                    ? `border-purple-500 bg-gradient-to-r ${color} text-white shadow-lg`
                    : 'border-border bg-muted/50 text-muted-foreground hover:border-muted-foreground/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {label}
              </motion.button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-white transition-all text-sm font-semibold"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={npsScore === null}
              className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all text-sm font-semibold"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}

      {step === 'comment' && (
        <motion.div
          key="comment"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-br from-card to-muted border border-border rounded-2xl p-8 max-w-md mx-auto"
        >
          <h3 className="text-2xl font-bold text-white mb-2">Any feedback?</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Tell us what could improve (optional)
          </p>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you think? What was missing?"
            className="w-full h-24 bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-white transition-all text-sm font-semibold"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all text-sm font-semibold"
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </motion.div>
      )}

      {step === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-600/50 rounded-2xl p-8 max-w-md mx-auto text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
              <ThumbsUp className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Thanks for playing!</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Your feedback helps us improve games. Ready for another?
          </p>
          <button
            onClick={onSkip}
            className="w-full px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all"
          >
            Continue
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
