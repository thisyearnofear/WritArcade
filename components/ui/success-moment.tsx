'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Sparkles } from 'lucide-react'

interface SuccessMomentProps {
  trigger: boolean
  onComplete?: () => void
}

/**
 * Success celebration animation
 * Plays when mint checklist is fully complete
 */
export function SuccessMoment({ trigger, onComplete }: SuccessMomentProps) {
  const [isShowing, setIsShowing] = useState(false)

   
  useEffect(() => {
    if (trigger) {
      setIsShowing(true)
      const timer = setTimeout(() => {
        setIsShowing(false)
        onComplete?.()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [trigger, onComplete])

  return (
    <AnimatePresence>
      {isShowing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          {/* Background blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />

          {/* Success content */}
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="relative"
              >
                <CheckCircle2 className="w-20 h-20 text-green-400" />
                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-300" />
              </motion.div>

              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Ready to Mint!</h2>
                <p className="text-gray-300">Your asset composition is complete</p>
              </div>

              {/* Confetti sparkles */}
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full"
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 1
                  }}
                  animate={{
                    x: Math.cos((i / 8) * Math.PI * 2) * 100,
                    y: Math.sin((i / 8) * Math.PI * 2) * 100 - 50,
                    opacity: 0
                  }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
