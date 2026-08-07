// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import '@testing-library/jest-dom/vitest'
import { MobileStepNav } from '@/components/ui/step-indicator'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: {
      ...actual.motion,
      button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props}>{children}</button>
      ),
      span: ({ children, ...props }: HTMLAttributes<HTMLSpanElement>) => (
        <span {...props}>{children}</span>
      ),
    },
  }
})

describe('MobileStepNav', () => {
  it('exposes an accessible back button and forwards when enabled', () => {
    const onBack = vi.fn()
    const onForward = vi.fn()

    render(
      <MobileStepNav
        currentStep="customize"
        canGoBack
        onBack={onBack}
        canGoForward
        onForward={onForward}
        forwardLabel="Review payment"
      />
    )

    expect(screen.getByRole('button', { name: 'Back to previous step' })).toBeInTheDocument()
    screen.getByRole('button', { name: /Review payment/i }).click()
    expect(onForward).toHaveBeenCalledOnce()
  })

  it('does not render a forward action when the step is not ready', () => {
    render(
      <MobileStepNav
        currentStep="payment"
        canGoBack
        onBack={vi.fn()}
        canGoForward={false}
      />
    )

    expect(screen.queryByRole('button', { name: /Generate/i })).not.toBeInTheDocument()
  })
})
