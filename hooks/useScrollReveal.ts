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

    const node = ref.current
    if (node) {
      observer.observe(node)
    }

    return () => {
      if (node) {
        observer.unobserve(node)
      }
    }
  }, [once])

  return { ref, isVisible }
}
