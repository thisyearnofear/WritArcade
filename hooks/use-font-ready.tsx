'use client'

import { useEffect, useState, useRef } from 'react'

interface FontReadyOptions {
  /** Timeout in ms - resolves false after this time */
  timeout?: number
  /** Font families to wait for (defaults to all document.fonts) */
  fontFamilies?: string[]
}

/**
 * Font-ready gating hook
 * 
 * Pretext principle: separate expensive prep from cheap layout
 * - Waits for web fonts to load before rendering text
 * - Prevents FOUC (Flash of Unstyled Content) for custom fonts
 * - Resolves after timeout even if fonts fail to load
 */
export function useFontReady(options: FontReadyOptions = {}) {
  const { timeout = 3000, fontFamilies } = options
  const [fontsReady, setFontsReady] = useState(false)
  const resolvedRef = useRef(false)

   
  useEffect(() => {
    // Already resolved
    if (resolvedRef.current) return
    
    // If document.fonts is not supported, skip
    if (!('fonts' in document)) {
      setFontsReady(true)
      resolvedRef.current = true
      return
    }

    const checkFonts = async () => {
      try {
        if (fontFamilies && fontFamilies.length > 0) {
          // Wait for specific fonts
          await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fontFamilies.map(family => (document.fonts as any).load(`16px "${family}"`))
          )
        } else {
          // Wait for all fonts
          await document.fonts.ready
        }
        
        if (!resolvedRef.current) {
          resolvedRef.current = true
          setFontsReady(true)
        }
      } catch (error) {
        // Fonts failed to load, but we should still proceed
        console.warn('Font loading warning:', error)
        if (!resolvedRef.current) {
          resolvedRef.current = true
          setFontsReady(true)
        }
      }
    }

    // Run check with timeout fallback
    const timeoutId = setTimeout(() => {
      if (!resolvedRef.current) {
        resolvedRef.current = true
        setFontsReady(true)
      }
    }, timeout)

     
    checkFonts().finally(() => clearTimeout(timeoutId))
  }, [timeout, fontFamilies?.join(',')])

  return fontsReady
}

/**
 * Font-ready wrapper component
 */
interface FontReadyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  fontFamilies?: string[]
  timeout?: number
}

export function FontReadyWrapper({
  children,
  fallback,
  fontFamilies,
  timeout,
}: FontReadyWrapperProps) {
  const fontsReady = useFontReady({ fontFamilies, timeout })

  if (!fontsReady) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <>{fallback}</> as any
  }

  return <>{children}</>
}