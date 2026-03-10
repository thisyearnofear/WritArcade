'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Toast } from '@/hooks/use-toast-notification'
import { cn } from '@/lib/utils'

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

/**
 * CONSOLIDATION: Toast container using CSS variables
 */
const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-400" />
}

const bgMap = {
  success: 'bg-green-900/20 border-green-700/30',
  error: 'bg-red-900/20 border-red-700/30',
  info: 'bg-blue-900/20 border-blue-700/30',
  warning: 'bg-yellow-900/20 border-yellow-700/30'
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 400, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              "p-4 rounded-lg border bg-gradient-to-br backdrop-blur-sm pointer-events-auto flex gap-3 items-start max-w-sm",
              bgMap[toast.type]
            )}
          >
            <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick()
                    onDismiss(toast.id)
                  }}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
