'use client'

import { motion, useReducedMotion, Variants } from 'framer-motion'
import { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

interface AnimatedTextProps {
  children: string
  className?: string
  delay?: number
  staggerDelay?: number
  once?: boolean
}

export function AnimatedText({
  children,
  className = '',
  delay = 0,
  staggerDelay = 0.03,
  once = true,
}: AnimatedTextProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <span className={className}>{children}</span>
  }

  const words = children.split(' ')

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  }

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  }

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="mr-[0.25em] inline-block"
          variants={child}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

interface GradientTextProps {
  children: ReactNode
  className?: string
  colors?: string[]
  animate?: boolean
}

export function GradientText({
  children,
  className = '',
  colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#8b5cf6'],
  animate = true,
}: GradientTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`

  if (!animate || prefersReducedMotion) {
    return (
      <span
        className={`bg-clip-text text-transparent ${className}`}
        style={{ backgroundImage: gradient }}
      >
        {children}
      </span>
    )
  }

  return (
    <motion.span
      className={`bg-clip-text text-transparent bg-[length:200%_auto] ${className}`}
      style={{
        backgroundImage: gradient,
      }}
      animate={{
        backgroundPosition: ['0% center', '200% center'],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  )
}

interface RevealTextProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

export function RevealText({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: RevealTextProps) {
  const prefersReducedMotion = useReducedMotion()

  const directionOffset = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  }

  if (prefersReducedMotion) {
    return <span className={className}>{children}</span>
  }

  return (
    <div className="overflow-hidden">
      <motion.span
        className={`inline-block ${className}`}
        initial={{
          opacity: 0,
          ...directionOffset[direction],
        }}
        whileInView={{
          opacity: 1,
          y: 0,
          x: 0,
        }}
        viewport={{ once: true }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.span>
    </div>
  )
}

interface CountUpProps {
  end: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function CountUp({
  end,
  duration = 2,
  className = '',
  prefix = '',
  suffix = '',
}: CountUpProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <span className={className}>
        {prefix}{end.toLocaleString()}{suffix}
      </span>
    )
  }

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 1 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Counter from={0} to={end} duration={duration} />
      </motion.span>
      {suffix}
    </motion.span>
  )
}

function Counter({ from, to, duration }: { from: number; to: number; duration: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion || !nodeRef.current) return

    const node = nodeRef.current
    const startTime = performance.now()
    const difference = to - from

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = Math.floor(from + difference * easeOutQuart)
      
      node.textContent = current.toLocaleString()

      if (progress < 1) {
        requestAnimationFrame(updateCount)
      }
    }

    requestAnimationFrame(updateCount)
  }, [from, to, duration, prefersReducedMotion])

  return <span ref={nodeRef}>{from.toLocaleString()}</span>
}

export function StreamingTypewriter({
  text,
  className = '',
  speed = 30, // characters per second
  onComplete,
}: {
  text: string
  className?: string
  speed?: number
  onComplete?: () => void
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const indexRef = useRef(0)
  const lastTimeRef = useRef(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      requestAnimationFrame(() => {
        setDisplayedText(text)
        onComplete?.()
      })
      return
    }

    // Animation loop drives state each frame — intentional effect pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayedText('')
    setIsTyping(true)
    indexRef.current = 0
    lastTimeRef.current = performance.now()

    let rafId: number

    const animate = (time: number) => {
      const deltaTime = time - lastTimeRef.current
      const charIncrement = (deltaTime / 1000) * speed

      if (charIncrement >= 1) {
        const nextIndex = Math.min(text.length, indexRef.current + Math.floor(charIncrement))
        if (nextIndex !== indexRef.current) {
          indexRef.current = nextIndex
          setDisplayedText(text.slice(0, nextIndex))
          lastTimeRef.current = time
        }
      }

      if (indexRef.current < text.length) {
        rafId = requestAnimationFrame(animate)
      } else {
        setIsTyping(false)
        requestAnimationFrame(() => onComplete?.())
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [text, speed, prefersReducedMotion, onComplete])

  return (
    <span className={className}>
      {displayedText}
      {isTyping && (
        <motion.span
          className="inline-block w-[2px] h-[1em] bg-current ml-1 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
    </span>
  )
}

