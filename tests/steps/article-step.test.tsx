// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ArticleStep } from '@/domains/games/components/steps/article-step'
import type { ArticlePreview } from '@/domains/games/components/game-generator-helpers'

// Suppress framer-motion's useReducedMotion (not available in jsdom)
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    useReducedMotion: () => false,
  }
})

const mockPreview: ArticlePreview = {
  title: 'The Great Article',
  author: 'Test Writer',
  wordCount: 500,
  estimatedReadTime: 2,
  excerpt: 'An excerpt...',
  sourceUrl: 'https://paragraph.xyz/test/article',
}

const baseProps = {
  url: 'https://paragraph.xyz/test/article',
  onUrlChange: vi.fn(),
  isMusdPath: true,
  detectedCoin: undefined,
  isAutoDetected: false,
  onUseDetectedCoin: vi.fn(),
  articlePreview: null,
  hasPreviewedCurrentUrl: false,
  isPreviewingArticle: false,
  onPreview: vi.fn(),
  initialMode: undefined,
  mode: 'story' as const,
  onSelectStory: vi.fn(),
  onSelectWordle: vi.fn(),
}

describe('ArticleStep', () => {
  it('renders the URL input with the article URL', () => {
    render(<ArticleStep {...baseProps} />)
    const input = screen.getByDisplayValue('https://paragraph.xyz/test/article')
    expect(input).toBeInTheDocument()
  })

  it('calls onUrlChange when the URL input changes', () => {
    const onUrlChange = vi.fn()
    render(<ArticleStep {...baseProps} onUrlChange={onUrlChange} />)
    const input = screen.getByDisplayValue('https://paragraph.xyz/test/article')
    fireEvent.change(input, { target: { value: 'https://paragraph.xyz/new/url' } })
    expect(onUrlChange).toHaveBeenCalledWith('https://paragraph.xyz/new/url')
  })

  it('shows "Preview article" button when no preview exists', () => {
    render(<ArticleStep {...baseProps} />)
    expect(screen.getByText('Preview article')).toBeInTheDocument()
  })

  it('uses 48px touch targets for the source input and preview action', () => {
    render(<ArticleStep {...baseProps} />)
    const input = screen.getByRole('textbox', { name: 'Paragraph.xyz Article URL' })
    const button = screen.getByRole('button', { name: 'Preview article' })

    expect(input).toHaveClass('min-h-[48px]')
    expect(button).toHaveClass('min-h-[48px]')
  })

  it('disables preview button when URL is empty', () => {
    render(<ArticleStep {...baseProps} url="" />)
    const button = screen.getByText('Preview article').closest('button')
    expect(button).toBeDisabled()
  })

  it('shows "Checking article..." when previewing', () => {
    render(<ArticleStep {...baseProps} isPreviewingArticle={true} url="https://paragraph.xyz/test" />)
    expect(screen.getByText('Checking article...')).toBeInTheDocument()
  })

  it('shows article preview card when preview is available', () => {
    render(
      <ArticleStep
        {...baseProps}
        articlePreview={mockPreview}
        hasPreviewedCurrentUrl={true}
      />
    )
    expect(screen.getByText('The Great Article')).toBeInTheDocument()
    expect(screen.getByText('Article ready')).toBeInTheDocument()
  })

  it('shows mode toggle when initialMode is wordle and no preview', () => {
    render(<ArticleStep {...baseProps} initialMode="wordle" />)
    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.getByText('Wordle')).toBeInTheDocument()
  })

  it('hides mode toggle when preview exists', () => {
    render(
      <ArticleStep
        {...baseProps}
        initialMode="wordle"
        articlePreview={mockPreview}
        hasPreviewedCurrentUrl={true}
      />
    )
    expect(screen.queryByText('Game Type')).not.toBeInTheDocument()
  })

  it('calls onSelectStory when Story mode button clicked', () => {
    const onSelectStory = vi.fn()
    render(<ArticleStep {...baseProps} initialMode="wordle" onSelectStory={onSelectStory} />)
    fireEvent.click(screen.getByText('Story'))
    expect(onSelectStory).toHaveBeenCalledOnce()
  })

  it('calls onSelectWordle when Wordle mode button clicked', () => {
    const onSelectWordle = vi.fn()
    render(<ArticleStep {...baseProps} initialMode="wordle" onSelectWordle={onSelectWordle} />)
    fireEvent.click(screen.getByText('Wordle'))
    expect(onSelectWordle).toHaveBeenCalledOnce()
  })

  it('shows MUSD placeholder when isMusdPath is true', () => {
    render(<ArticleStep {...baseProps} url="" />)
    const input = screen.getByPlaceholderText(/any article/)
    expect(input).toBeInTheDocument()
  })
})
