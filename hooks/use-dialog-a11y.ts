import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
  )
}

export interface UseDialogA11yOptions {
  /** When true, clicking the backdrop closes the dialog */
  closeOnBackdrop?: boolean
  /** Lock body scroll while open */
  lockScroll?: boolean
}

/**
 * Accessible modal helper: focus trap (Tab cycles inside), Escape to dismiss,
 * restore focus on close, optional scroll lock.
 */
export function useDialogA11y(
  open: boolean,
  onClose: () => void,
  options: UseDialogA11yOptions = {},
) {
  const { closeOnBackdrop = false, lockScroll = true } = options
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop) onCloseRef.current()
  }, [closeOnBackdrop])

  useEffect(() => {
    if (!open) return

    const previousActive = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow

    if (lockScroll) {
      document.body.style.overflow = 'hidden'
    }

    const focusDialog = () => {
      const root = dialogRef.current
      if (!root) return
      const focusable = getFocusableElements(root)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        root.focus()
      }
    }

    const timer = window.setTimeout(focusDialog, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const root = dialogRef.current
      if (!root) return

      const focusable = getFocusableElements(root)
      if (focusable.length === 0) {
        event.preventDefault()
        root.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown, true)
      if (lockScroll) {
        document.body.style.overflow = previousOverflow
      }
      previousActive?.focus?.()
    }
  }, [open, lockScroll])

  return { dialogRef, handleBackdropClick }
}
