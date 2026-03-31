import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant - line for text, circle for avatars, square for cards */
  variant?: "line" | "circle" | "square" | "card"
  /** Width of the skeleton */
  width?: React.CSSProperties["width"]
  /** Height of the skeleton - adapts based on variant if not specified */
  height?: React.CSSProperties["height"]
  /** P3: layoutId for skeleton-to-content morphing with Framer Motion */
  layoutId?: string
  /** Enable motion animations */
  animate?: boolean
}

/**
 * CONSOLIDATION: Reusable skeleton component with shimmer effect
 * - Uses CSS variables for theming
 * - Supports multiple variants for different content types
 * - Respects reduced motion preferences
 * - P3: Supports layoutId for skeleton-to-content morphing
 */
function Skeleton({
  className,
  variant = "line",
  width,
  height,
  layoutId,
  animate = true,
  ...props
}: SkeletonProps) {
  const baseStyles: React.CSSProperties = {
    width: width,
    height: height,
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    line: {
      height: height || "1rem",
      borderRadius: "var(--radius)",
    },
    circle: {
      width: width || "3rem",
      height: height || "3rem",
      borderRadius: "50%",
    },
    square: {
      borderRadius: "var(--radius)",
    },
    card: {
      height: height || "200px",
      borderRadius: "var(--radius)",
    },
  }

  // P3: Use motion.div for morphing, regular div for static
  const shimmerClass = animate 
    ? "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]"
    : "bg-muted"

  return (
    animate ? (
      <motion.div
        className={cn(shimmerClass, className)}
        style={{
          ...baseStyles,
          ...variantStyles[variant],
        }}
        layoutId={layoutId}
        transition={{ duration: 0.3 }}
      />
    ) : (
      <div
        className={cn(shimmerClass, className)}
        style={{
          ...baseStyles,
          ...variantStyles[variant],
        }}
        {...props}
      />
    )
  )
}

/**
 * Pre-built skeleton patterns for common use cases
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton variant="square" className="h-48 w-full" />
      <Skeleton variant="line" className="w-3/4" />
      <Skeleton variant="line" className="w-1/2" />
    </div>
  )
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="line"
          className={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  )
}

function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton variant="circle" className={cn("h-10 w-10", className)} />
}

export { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar }
