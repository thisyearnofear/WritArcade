'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'

interface SkeletonShimmerProps {
  className?: string
  lines?: number
  showAvatar?: boolean
}

export function SkeletonShimmer({
  className = '',
  lines = 3,
  showAvatar = true,
}: SkeletonShimmerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {showAvatar && (
        <div className="flex items-center space-x-4">
          <ShimmerBox className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <ShimmerBox className="h-4 w-1/4 rounded" />
            <ShimmerBox className="h-3 w-1/6 rounded" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <ShimmerBox
            key={i}
            className="h-4 rounded"
            style={{ width: `${Math.random() * 40 + 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function ShimmerBox({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div
        className={`bg-gray-800 ${className}`}
        style={style}
      />
    )
  }

  return (
    <div className={`relative overflow-hidden bg-gray-800 ${className}`} style={style}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

interface CardSkeletonProps {
  className?: string
}

export function CardSkeleton({ className = '' }: CardSkeletonProps) {
  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      {/* Header shimmer */}
      <div className="relative h-1 overflow-hidden bg-gray-200 dark:bg-gray-800">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.35) 50%, transparent 100%)',
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      
      {/* Content shimmer */}
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <ShimmerBox className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
        
        <ShimmerBox className="h-6 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
        <ShimmerBox className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
        <ShimmerBox className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
        
        <div className="flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
          <ShimmerBox className="h-9 flex-1 rounded bg-gray-200 dark:bg-gray-800" />
          <ShimmerBox className="h-9 w-20 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  )
}

interface GridSkeletonProps {
  count?: number
  columns?: number
  className?: string
}

export function GridSkeleton({
  count = 6,
  columns = 3,
  className = '',
}: GridSkeletonProps) {
  const prefersReducedMotion = useReducedMotion()
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <CardSkeleton />
        </motion.div>
      ))}
    </div>
  )
}
