import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations'
import { motion, useReducedMotion } from "framer-motion"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        mobile: "h-12 px-6 min-h-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  // Omit drag/animation handler props whose DOM signatures clash with
  // framer-motion's HTMLMotionProps overriding handlers.
  extends Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
    >,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  arcade?: boolean
  mobile?: boolean
  animated?: boolean
}

// Render motion directly on the <button> element — wrapping in motion.div
// broke flex baselines, disabled hit-slop semantics, and form layout at call
// sites. Scale micro-interaction only; hover shine removed.
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, arcade = false, mobile = false, animated = true, ...props }, ref) => {
    const { isMobile } = useMobileOptimizations()
    const prefersReducedMotion = useReducedMotion()

    const arcadeClasses = arcade ? "arcade-button" : ""
    const mobileClasses = (mobile || isMobile) ? "min-h-[48px] min-w-[48px] px-6 py-3" : ""
    const classes = cn(buttonVariants({ variant, size, className }), arcadeClasses, mobileClasses)

    if (asChild) {
      return (
        <Slot
          className={classes}
          ref={ref}
          {...props}
        />
      )
    }

    if (animated && !prefersReducedMotion) {
      return (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className={classes}
          ref={ref}
          {...props}
        />
      )
    }

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
