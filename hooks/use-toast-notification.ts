import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

/**
 * Toast notification hook
 * Manages notification state with auto-dismiss
 */
export function useToastNotification() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, options: {
      type?: 'success' | 'error' | 'info' | 'warning'
      duration?: number
      action?: { label: string; onClick: () => void }
    } = {}) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const toast: Toast = {
        id,
        message,
        type: options.type || 'info',
        duration: options.duration || 4000,
        action: options.action
      }

      setToasts((prev) => [...prev, toast])

      // Auto-dismiss
      if (toast.duration) {
        setTimeout(() => {
          dismiss(id)
        }, toast.duration)
      }

      return id
    },
    [dismiss]
  )

  return { toasts, show, dismiss }
}
