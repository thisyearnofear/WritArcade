interface ProgressBarProps {
  value: number
  label?: string
  percent?: boolean
  animated?: boolean
}

/**
 * Reusable progress bar component used by modals, loaders, and progress indicators
 */
export function ProgressBar({
  value,
  label = 'Progress',
  percent = true,
  animated = true,
}: ProgressBarProps) {
  // Ensure value is between 0 and 100
  const normalizedValue = Math.min(Math.max(value, 0), 100)
  const displayPercent = Math.round(normalizedValue)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {percent && <span>{displayPercent}%</span>}
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`bg-gradient-to-r from-purple-500 to-pink-500 h-2 ${
            animated ? 'transition-all duration-300' : ''
          }`}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    </div>
  )
}
