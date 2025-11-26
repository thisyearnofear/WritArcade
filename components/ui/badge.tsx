import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-blue-900 text-blue-200 border border-blue-700",
      secondary: "bg-gray-700 text-gray-100 border border-gray-600",
      success: "bg-green-900 text-green-200 border border-green-700",
      warning: "bg-yellow-900 text-yellow-200 border border-yellow-700",
      danger: "bg-red-900 text-red-200 border border-red-700",
      outline: "bg-transparent text-gray-300 border border-gray-500",
    }

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
          variants[variant]
        } ${className || ""}`}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
