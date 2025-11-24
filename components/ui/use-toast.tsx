'use client'

import * as React from 'react'

type ToastVariant = 'default' | 'destructive'

export interface Toast {
    id: string
    title?: string
    description?: string
    variant?: ToastVariant
}

interface ToastContextValue {
    toasts: Toast[]
    toast: (props: Omit<Toast, 'id'>) => void
    dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([])

    const toast = React.useCallback((props: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts((prev) => [...prev, { ...props, id }])

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 5000)
    }, [])

    const dismiss = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = React.useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}
