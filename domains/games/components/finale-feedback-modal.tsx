'use client'

import { PostGameFeedback } from '@/components/game/post-game-feedback'
import { disableFeedbackPrompts } from './feedback-prompt'

interface FinaleFeedbackModalProps {
  show: boolean
  onClose: () => void
}

/**
 * Post-game NPS feedback modal.
 * Extracted from ComicBookFinale to isolate the feedback submission logic.
 */
export function FinaleFeedbackModal({ show, onClose }: FinaleFeedbackModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg">
        <PostGameFeedback
          onSubmit={async (feedback) => {
            try {
              const slug = window.location.pathname.split('/').pop() || ''
              const response = await fetch(`/api/games/${slug}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  npsScore: feedback.npsScore,
                  npsComment: feedback.comment,
                }),
              })
              if (!response.ok) {
                throw new Error('Failed to submit feedback')
              }
            } catch (error) {
              console.error('Error submitting feedback:', error)
              // Don't throw, let user close anyway
            }
          }}
          onSkip={onClose}
          onDisable={() => {
            disableFeedbackPrompts()
            onClose()
          }}
        />
      </div>
    </div>
  )
}
