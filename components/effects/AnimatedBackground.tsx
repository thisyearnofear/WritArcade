'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

interface AnimatedBackgroundProps {
  variant?: 'gradient' | 'mesh' | 'particles' | 'aurora'
  className?: string
}

export function AnimatedBackground({ variant = 'gradient', className = '' }: AnimatedBackgroundProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={`absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20 ${className}`} />
  }

  switch (variant) {
    case 'mesh':
      return <MeshGradient className={className} />
    case 'particles':
       
      return <ParticleField className={className} />
    case 'aurora':
      return <AuroraEffect className={className} />
    default:
      return <GradientFlow className={className} />
  }
}

function GradientFlow({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Primary gradient orb */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: ['-20%', '30%', '-20%'],
          y: ['-20%', '20%', '-20%'],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Secondary gradient orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%)',
          filter: 'blur(50px)',
          right: '-10%',
          top: '20%',
        }}
        animate={{
          x: ['10%', '-20%', '10%'],
          y: ['0%', '30%', '0%'],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Tertiary accent orb */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          filter: 'blur(40px)',
          left: '30%',
          bottom: '10%',
        }}
        animate={{
          x: ['-10%', '20%', '-10%'],
          y: ['10%', '-10%', '10%'],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 4,
        }}
      />
    </div>
  )
}

function MeshGradient({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mesh1" x1="0%" y1="0%" x2="100%" y2="100%">
            <motion.stop
              offset="0%"
              stopColor="rgba(139, 92, 246, 0.4)"
              animate={{ stopColor: ['rgba(139, 92, 246, 0.4)', 'rgba(236, 72, 153, 0.4)', 'rgba(139, 92, 246, 0.4)'] }}
              transition={{ duration: 10, repeat: Infinity }}
            />
            <motion.stop
              offset="100%"
              stopColor="rgba(236, 72, 153, 0.2)"
              animate={{ stopColor: ['rgba(236, 72, 153, 0.2)', 'rgba(59, 130, 246, 0.2)', 'rgba(236, 72, 153, 0.2)'] }}
              transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            />
          </linearGradient>
          <linearGradient id="mesh2" x1="100%" y1="0%" x2="0%" y2="100%">
            <motion.stop
              offset="0%"
              stopColor="rgba(59, 130, 246, 0.3)"
              animate={{ stopColor: ['rgba(59, 130, 246, 0.3)', 'rgba(139, 92, 246, 0.3)', 'rgba(59, 130, 246, 0.3)'] }}
              transition={{ duration: 12, repeat: Infinity, delay: 1 }}
            />
            <motion.stop
              offset="100%"
              stopColor="rgba(139, 92, 246, 0.1)"
              animate={{ stopColor: ['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)', 'rgba(139, 92, 246, 0.1)'] }}
              transition={{ duration: 12, repeat: Infinity, delay: 3 }}
            />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#mesh1)" />
        <rect width="100%" height="100%" fill="url(#mesh2)" opacity="0.7" />
      </svg>
    </div>
  )
}

function ParticleField({ className }: { className?: string }) {
  // Use seeded random to avoid impure function calls during render
  const particles = useMemo(() => {
     
    let seed = 12345
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: seededRandom() * 4 + 2,
      x: seededRandom() * 100,
      y: seededRandom() * 100,
      xOffset: seededRandom() * 50 - 25,
      duration: seededRandom() * 20 + 10,
      delay: seededRandom() * 5,
    }))
  }, [])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, particle.xOffset, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function AuroraEffect({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, transparent 50%, rgba(236, 72, 153, 0.2) 100%)',
        }}
        animate={{
          background: [
            'linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, transparent 50%, rgba(236, 72, 153, 0.2) 100%)',
            'linear-gradient(180deg, rgba(236, 72, 153, 0.2) 0%, transparent 50%, rgba(59, 130, 246, 0.2) 100%)',
            'linear-gradient(180deg, rgba(59, 130, 246, 0.2) 0%, transparent 50%, rgba(139, 92, 246, 0.2) 100%)',
            'linear-gradient(180deg, rgba(139, 92, 246, 0.2) 0%, transparent 50%, rgba(236, 72, 153, 0.2) 100%)',
          ],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Wave effect */}
      <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 1440 200" preserveAspectRatio="none">
        <motion.path
          d="M0,100 C360,150 720,50 1080,100 C1260,125 1380,75 1440,100 L1440,200 L0,200 Z"
          fill="rgba(139, 92, 246, 0.1)"
          animate={{
            d: [
              'M0,100 C360,150 720,50 1080,100 C1260,125 1380,75 1440,100 L1440,200 L0,200 Z',
              'M0,120 C360,70 720,130 1080,80 C1260,55 1380,105 1440,80 L1440,200 L0,200 Z',
              'M0,100 C360,150 720,50 1080,100 C1260,125 1380,75 1440,100 L1440,200 L0,200 Z',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </svg>
    </div>
  )
}
