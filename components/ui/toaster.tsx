'use client'

import * as React from 'react'
import { useToast as useToastPrimitive, type Toast } from './use-toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToastPrimitive()

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map(({ id, title, description, variant, action, ...props }: Toast) => (
        <div
          key={id}
          className={cn(
            'group pointer-events-auto relative flex w-full items-start justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
            variant === 'destructive'
              ? 'border-destructive bg-destructive text-destructive-foreground'
              : 'border-border bg-popover text-popover-foreground',
          )}
          {...props}
        >
          <div className="grid gap-1 flex-1 min-w-0">
            {title && <div className="text-sm font-semibold">{title}</div>}
            {description && (
              <div className="text-sm opacity-90">{description}</div>
            )}
            {action && (
              <button
                onClick={() => {
                  action.onClick()
                  dismiss(id)
                }}
                className="mt-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors text-left"
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}