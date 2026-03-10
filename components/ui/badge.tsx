import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline"
}

/**
 * CONSOLIDATION: Badge using CSS variables
 * - Uses shadcn/ui semantic colors instead of hardcoded Tailwind colors
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-primary/10 text-primary border-primary/20",
      secondary: "bg-secondary/10 text-secondary-foreground border-secondary/20",
      success: "bg-green-500/10 text-green-500 border-green-500/20",
      warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      danger: "bg-destructive/10 text-destructive border-destructive/20",
      outline: "text-foreground border-border",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
