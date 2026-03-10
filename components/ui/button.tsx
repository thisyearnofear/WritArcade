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
        // CONSOLIDATION: Removed writarcade variants - use default/secondary instead
        // CONSOLIDATION: Removed link variant - use ghost variant for links
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        mobile: "h-12 px-6 min-h-[48px]", // CONSOLIDATION: Simplified mobile sizing
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  arcade?: boolean
  mobile?: boolean
  animated?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, arcade = false, mobile = false, animated = true, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile } = useMobileOptimizations()
    const prefersReducedMotion = useReducedMotion()
    
    const arcadeClasses = arcade ? "arcade-button" : ""
    const mobileClasses = (mobile || isMobile) ? "min-h-[48px] min-w-[48px] px-6 py-3" : ""
    
    // Animated button with micro-interactions
    if (animated && !prefersReducedMotion) {
      return (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Comp
            className={cn(buttonVariants({ variant, size, className }), arcadeClasses, mobileClasses, "relative overflow-hidden")}
            ref={ref}
            {...props}
          >
            {/* Shine effect overlay */}
            <motion.span
              className="absolute inset-0 pointer-events-none"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
              }}
            />
            {/* Content wrapper to keep above shine */}
            <span className="relative z-10">
              {props.children}
            </span>
          </Comp>
        </motion.div>
      )
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), arcadeClasses, mobileClasses)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
