'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Minimal scroll-triggered animation hook
 * Returns isVisible boolean to control Framer Motion animations
 */
export function useScrollReveal(once = true) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(entry.target)
        }
      },
      {
        rootMargin: '-100px 0px -100px 0px',
        threshold: 0.1,
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [once])

  return { ref, isVisible }
}
