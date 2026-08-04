// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { GenerateStep } from '@/domains/games/components/steps/generate-step'

// Suppress framer-motion's useReducedMotion (not available in jsdom)
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    useReducedMotion: () => false,
  }
})

// Button uses useMobileOptimizations which needs window.matchMedia
vi.mock('@/hooks/useMobileOptimizations', () => ({
  useMobileOptimizations: () => ({
    isMobile: false,
    prefersReducedMotion: false,
    isTouchDevice: false,
    windowSize: { width: 1024, height: 768 },
    optimized: false,
    getMobileClasses: (base: string) => base,
    getTouchClasses: (base: string) => base,
  }),
}))

describe('GenerateStep', () => {
  const baseProps = {
    isGenerating: false,
    hasPreviewedCurrentUrl: false,
    isPreviewingArticle: false,
    isStoryMode: true,
    paymentApproved: false,
    genre: 'horror' as const,
    url: '',
  }

  it('shows "Preview Article" when no URL and not previewing', () => {
    render(<GenerateStep {...baseProps} />)
    expect(screen.getByText('Preview Article')).toBeInTheDocument()
  })

  it('shows "Checking Article..." when previewing', () => {
    render(<GenerateStep {...baseProps} isPreviewingArticle={true} url="https://example.com" />)
    expect(screen.getByText('Checking Article...')).toBeInTheDocument()
  })

  it('shows "Complete Payment to Generate" when previewed but not paid', () => {
    render(<GenerateStep {...baseProps} hasPreviewedCurrentUrl={true} url="https://example.com" />)
    expect(screen.getByText('Complete Payment to Generate')).toBeInTheDocument()
  })

  it('shows "Generate Custom Horror Game" when paid', () => {
    render(<GenerateStep {...baseProps} hasPreviewedCurrentUrl={true} paymentApproved={true} url="https://example.com" />)
    expect(screen.getByText('Generate Custom Horror Game')).toBeInTheDocument()
  })

  it('shows "Create Wordle Game (Free)" in wordle mode', () => {
    render(<GenerateStep {...baseProps} isStoryMode={false} hasPreviewedCurrentUrl={true} url="https://example.com" />)
    expect(screen.getByText('Create Wordle Game (Free)')).toBeInTheDocument()
  })

  it('shows "Generating Game..." with spinner when generating', () => {
    const { container } = render(<GenerateStep {...baseProps} isGenerating={true} />)
    expect(screen.getByText('Generating Game...')).toBeInTheDocument()
    // The spinner is an SVG with animate-spin class
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  it('disables the button when generating', () => {
    render(<GenerateStep {...baseProps} isGenerating={true} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('capitalizes genre name in the generate label', () => {
    render(<GenerateStep {...baseProps} hasPreviewedCurrentUrl={true} paymentApproved={true} genre="comedy" url="https://example.com" />)
    expect(screen.getByText('Generate Custom Comedy Game')).toBeInTheDocument()
  })
})
