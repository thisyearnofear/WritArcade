'use client'

import { useMemo } from 'react'

/**
 * Pretext-inspired text layout utility.
 * Uses Canvas API for synchronous, DOM-free text measurement.
 * Avoids layout thrash and reflow by calculating dimensions mathematically.
 */

interface TextMetrics {
  width: number
  height: number
  lineCount: number
  lines: string[]
}

export function useTextLayout(
  text: string,
  maxWidth: number,
  font: string,
  lineHeight: number = 1.5
): TextMetrics {
  return useMemo(() => {
    if (typeof document === 'undefined') {
      return { width: 0, height: 0, lineCount: 0, lines: [] }
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      return { width: 0, height: 0, lineCount: 0, lines: [] }
    }

    context.font = font
    
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = words[0] || ''

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const width = context.measureText(currentLine + ' ' + word).width
      if (width < maxWidth) {
        currentLine += ' ' + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    lines.push(currentLine)

    // Estimate font height (approximate if not provided)
    const fontSize = parseInt(font) || 16
    const calculatedHeight = lines.length * fontSize * lineHeight

    return {
      width: maxWidth,
      height: calculatedHeight,
      lineCount: lines.length,
      lines,
    }
  }, [text, maxWidth, font, lineHeight])
}

interface PretextContainerProps {
  text: string
  font?: string
  maxWidth: number
  lineHeight?: number
  className?: string
  style?: React.CSSProperties
  children?: (metrics: TextMetrics) => React.ReactNode
}

/**
 * A container that pre-calculates its own size based on text content
 * before rendering, preventing CLS and layout thrash.
 */
export function PretextContainer({
  text,
  font = '16px Inter, system-ui, sans-serif',
  maxWidth,
  lineHeight = 1.5,
  className,
  style,
  children
}: PretextContainerProps) {
  const metrics = useTextLayout(text, maxWidth, font, lineHeight)

  return (
    <div 
      className={className}
      style={{
        ...style,
        width: '100%',
        maxWidth: maxWidth,
        minHeight: metrics.height,
        containIntrinsicSize: `${maxWidth}px ${metrics.height}px`,
        contentVisibility: 'auto'
      }}
    >
      {children ? children(metrics) : text}
    </div>
  )
}
