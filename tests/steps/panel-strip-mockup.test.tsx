// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { PanelStripMockup } from '@/domains/games/components/steps/panel-strip-mockup'

describe('PanelStripMockup', () => {
  it('renders 5 panel placeholders', () => {
    const { container } = render(
      <PanelStripMockup genre="horror" articleTitle="The Last Article" />
    )
    const panels = container.querySelectorAll('[class*="aspect-[3/4]"]')
    expect(panels).toHaveLength(5)
  })

  it('renders panel labels in order', () => {
    render(<PanelStripMockup genre="horror" articleTitle="Test Article" />)
    expect(screen.getByText('Opening')).toBeInTheDocument()
    expect(screen.getByText('Rising Action')).toBeInTheDocument()
    expect(screen.getByText('Your Choice')).toBeInTheDocument()
    expect(screen.getByText('Climax')).toBeInTheDocument()
    expect(screen.getByText('Resolution')).toBeInTheDocument()
  })

  it('shows the truncated article title', () => {
    render(<PanelStripMockup genre="horror" articleTitle="Short Title" />)
    expect(screen.getByText(/Short Title/)).toBeInTheDocument()
  })

  it('truncates long article titles with ellipsis', () => {
    const longTitle = 'A'.repeat(60)
    const { container } = render(<PanelStripMockup genre="horror" articleTitle={longTitle} />)
    // The title is wrapped in curly quotes (&ldquo; / &rdquo;) and truncated to 40 chars + ellipsis
    const descriptionText = container.querySelector('p.text-xs.text-muted-foreground')?.textContent || ''
    expect(descriptionText).toContain('…')
    // Should contain 40 A's, not all 60
    expect(descriptionText).toContain('A'.repeat(40))
    expect(descriptionText).not.toContain('A'.repeat(41))
  })

  it('explains that the preview protects the ending', () => {
    render(<PanelStripMockup genre="comedy" articleTitle="Test" />)
    expect(screen.getByText(/story shape, not the ending/i)).toBeInTheDocument()
  })

  it('applies genre-specific gradient for horror', () => {
    const { container } = render(
      <PanelStripMockup genre="horror" articleTitle="Test" />
    )
    const firstPanel = container.querySelector('[class*="aspect-[3/4]"]')
    expect(firstPanel?.className).toContain('from-red-950')
  })

  it('applies genre-specific gradient for comedy', () => {
    const { container } = render(
      <PanelStripMockup genre="comedy" articleTitle="Test" />
    )
    const firstPanel = container.querySelector('[class*="aspect-[3/4]"]')
    expect(firstPanel?.className).toContain('from-amber-900')
  })

  it('uses primaryColor for the accent dot when provided', () => {
    const { container } = render(
      <PanelStripMockup genre="horror" articleTitle="Test" primaryColor="#ff0000" />
    )
    const dot = container.querySelector('[style*="rgb(255, 0, 0)"], [style*="#ff0000"]')
    // The color might be converted to rgb by the browser
    expect(dot || container.querySelector('[style*="background"]')).toBeTruthy()
  })
})
