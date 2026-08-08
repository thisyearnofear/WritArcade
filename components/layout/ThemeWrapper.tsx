'use client'

import { ReactNode, useMemo } from 'react'
import { useDarkMode } from '@/components/providers/DarkModeProvider'

interface ThemeWrapperProps {
  children: ReactNode
  theme?: 'arcade' | 'default'
}

/**
 * CONSOLIDATION: Simplified ThemeWrapper
 * - Uses CSS variables from globals.css (single source of truth)
 * - Only adds arcade-specific styling (paper texture background)
 * - Remove duplicate color definitions that conflicted with globals.css
 */
export function ThemeWrapper({ children, theme = 'default' }: ThemeWrapperProps) {
  const { isDarkMode } = useDarkMode()
  
  // CONSOLIDATION: Only add arcade-specific classes, use CSS variables for colors
  const themeClasses = useMemo(() => {
    if (theme === 'arcade') {
      return isDarkMode
        ? 'writersarcade-theme dark min-h-screen'
        : 'writersarcade-theme min-h-screen'
    }
    return 'min-h-screen'
  }, [theme, isDarkMode])

  return (
    <div className={themeClasses}>
      {children}
    </div>
  )
}