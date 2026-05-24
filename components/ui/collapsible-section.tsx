'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertCircle } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  hasWarnings?: boolean
  children: React.ReactNode
}

/**
 * Collapsible section with smooth open/close animations
 * Shows warning indicator when content needs attention
 */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  hasWarnings = false,
  children
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || hasWarnings)

  return (
    <div className="rounded-xl overflow-hidden border border-border/30 bg-muted/20">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-foreground">{title}</h3>
          {hasWarnings && !isOpen && (
            <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-border/30 overflow-hidden"
          >
            <div className="px-6 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
