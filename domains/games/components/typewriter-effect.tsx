'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface TypewriterEffectProps {
  text: string
  isVisible: boolean
  /** Characters to reveal per frame - higher = faster but less smooth */
  charsPerFrame?: number
  /** Minimum frames between updates for pacing */
  minFrameDelay?: number
  onComplete?: () => void
}

/**
 * RAF-batched typewriter effect
 * 
 * Pretext principle: batch DOM writes per frame instead of per-token
 * Uses requestAnimationFrame for smooth, jank-free rendering
 * - Separates expensive prep (text splitting) from cheap layout (state updates)
 * - No DOM reads in hot path (no getBoundingClientRect)
 * - Batched character updates for ~60fps smoothness
 */
export function TypewriterEffect({
  text,
  isVisible,
  charsPerFrame = 3,
  minFrameDelay = 0,
  onComplete,
}: TypewriterEffectProps) {
  const [displayText, setDisplayText] = useState('')
  const rafRef = useRef<number | null>(null)
  const lastFrameTime = useRef<number>(0)
  const textRef = useRef(text)
  const onCompleteRef = useRef(onComplete)
  const isCompleteRef = useRef(false)
  const runningRef = useRef(false)
  
  // Keep refs updated
  useEffect(() => {
    textRef.current = text
  }, [text])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const tick = useCallback((timestamp: number) => {
    // Pacing control - skip frames if needed
    if (minFrameDelay > 0 && timestamp - lastFrameTime.current < minFrameDelay) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    lastFrameTime.current = timestamp

    setDisplayText(prev => {
      const currentLength = prev.length
      const targetLength = textRef.current.length
      
      if (currentLength >= targetLength) {
        isCompleteRef.current = true
        runningRef.current = false
        onCompleteRef.current?.()
        return prev
      }
      
      // Batch multiple chars per frame (Pretext-style optimization)
      const nextLength = Math.min(currentLength + charsPerFrame, targetLength)
      return textRef.current.slice(0, nextLength)
    })

    // Continue animation - use ref to check
    if (!isCompleteRef.current && runningRef.current) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [charsPerFrame, minFrameDelay])

  useEffect(() => {
    if (!isVisible) {
      setDisplayText('')
      isCompleteRef.current = false
      runningRef.current = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    // Reset when text changes
    setDisplayText('')
    lastFrameTime.current = 0
    isCompleteRef.current = false
    runningRef.current = true

    // Start RAF loop
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      runningRef.current = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [text, isVisible, tick])

  return displayText
}

/**
 * Hook version for more advanced use cases
 */
export function useTypewriter(text: string, isVisible: boolean, options = {}) {
  const { charsPerFrame = 3, minFrameDelay = 0 } = options
  const [displayText, setDisplayText] = useState('')
  const rafRef = useRef<number | null>(null)
  const lastFrameTime = useRef<number>(0)
  const textRef = useRef(text)
  const onCompleteRef = useRef<(() => void) | null>(null)
  const isCompleteRef = useRef(false)
  const runningRef = useRef(false)

  useEffect(() => {
    textRef.current = text
  }, [text])

  const startAnimation = useCallback(() => {
    let frame = 0
    const chars = text.split('')
    isCompleteRef.current = false
    runningRef.current = true
    
    function tick(timestamp: number) {
      if (minFrameDelay > 0 && timestamp - lastFrameTime.current < minFrameDelay) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      lastFrameTime.current = timestamp

      frame++
      const endIndex = Math.min(frame * charsPerFrame, chars.length)
      setDisplayText(chars.slice(0, endIndex).join(''))

      if (endIndex < chars.length) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        isCompleteRef.current = true
        runningRef.current = false
        onCompleteRef.current?.()
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [charsPerFrame, minFrameDelay])

  useEffect(() => {
    if (!isVisible) {
      setDisplayText('')
      isCompleteRef.current = false
      runningRef.current = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      return
    }

    setDisplayText('')
    startAnimation()

    return () => {
      runningRef.current = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [text, isVisible, startAnimation])

  return displayText
}
