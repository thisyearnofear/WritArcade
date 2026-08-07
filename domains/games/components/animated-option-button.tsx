'use client'

import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface AnimatedOptionButtonProps {
  option: string
  optionId: number
  isSelected: boolean
  isWaiting: boolean
  primaryColor: string
  disabled: boolean
  onClick: () => void
}

export function AnimatedOptionButton({
  option,
  optionId,
  isSelected,
  isWaiting,
  primaryColor,
  disabled,
  onClick,
}: AnimatedOptionButtonProps) {
  const isLoading = isSelected && isWaiting
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="group relative p-4 sm:p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-lg hover:shadow-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        borderColor: isSelected ? primaryColor : `${primaryColor}50`,
        backgroundColor: isSelected ? `${primaryColor}20` : `${primaryColor}08`,
        color: 'white',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
      type="button"
    >
      {/* Top animated bar indicator with enhanced micro-interaction */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: primaryColor }}
        initial={{ scaleX: isSelected ? 1 : 0 }}
        animate={{ scaleX: isSelected ? 1 : (isHovered ? 1 : 0) }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* Loading glow effect with enhanced animation */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 rounded-lg opacity-0"
          style={{
            backgroundColor: `${primaryColor}20`,
            boxShadow: `0 0 20px ${primaryColor}40`,
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{
            opacity: { duration: 1.5, repeat: Infinity },
            scale: { duration: 1.5, repeat: Infinity },
          }}
        />
      )}

      <div className="flex gap-3 items-center relative z-10">
        <span
          className="w-8 h-8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-sm sm:text-xs font-bold flex-shrink-0 transition-all duration-200"
          style={{
            backgroundColor: isLoading ? primaryColor : `${primaryColor}70`,
            boxShadow: isLoading ? `0 0 12px ${primaryColor}60` : 'none',
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 sm:w-3 sm:h-3 animate-spin" /> : optionId}
        </span>
        <span className="leading-snug font-medium text-base sm:text-sm flex-1">{option}</span>
      </div>
    </motion.button>
  )
}
