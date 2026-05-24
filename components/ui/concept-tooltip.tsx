'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface ConceptTooltipProps {
  /** The term being explained */
  term: string
  /** Plain-language explanation of the concept */
  explanation: string
  /** The element that triggers the tooltip */
  children: React.ReactNode
}

/**
 * Contextual tooltip for explaining Web3/crypto concepts inline.
 * Uses a portal to avoid clipping by overflow:hidden parents.
 * Accessible: triggered on hover and focus, dismissed on Escape.
 */
export function ConceptTooltip({ term, explanation, children }: ConceptTooltipProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(8, rect.left + rect.width / 2 - 160),
    })
  }, [])

  useEffect(() => {
    if (open) {
      updatePosition()
      const handleResize = () => updatePosition()
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleResize, true)
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleResize, true)
      }
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        role="button"
        aria-describedby={open ? `tooltip-${term}` : undefined}
        className="inline"
      >
        {children}
      </span>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                id={`tooltip-${term}`}
                ref={tooltipRef}
                role="tooltip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[200] w-80 max-w-[calc(100vw-2rem)] p-3 rounded-lg bg-popover border border-border shadow-lg text-sm text-popover-foreground leading-relaxed"
                style={{ top: position.top, left: position.left }}
              >
                <p className="font-semibold text-foreground mb-1">{term}</p>
                <p className="text-muted-foreground">{explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
