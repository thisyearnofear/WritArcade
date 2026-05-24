'use client'

import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  isOpen: boolean
  imageUrl: string | null
  imageModel?: string
  narrativeText?: string
  panelNumber?: number
  totalPanels?: number
  primaryColor: string
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  canNavigatePrev?: boolean
  canNavigateNext?: boolean
}

export function ImageLightbox({
  isOpen,
  imageUrl,
  imageModel,
  narrativeText,
  panelNumber,
  totalPanels,
  primaryColor,
  onClose,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
}: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onNavigate && canNavigatePrev) onNavigate('prev')
      if (e.key === 'ArrowRight' && onNavigate && canNavigateNext) onNavigate('next')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNavigate, canNavigatePrev, canNavigateNext])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderColor: `${primaryColor}30` }}
        >
          <div className="flex items-center gap-3">
            {panelNumber !== undefined && totalPanels !== undefined && (
              <span className="text-sm text-muted-foreground">
                Panel {panelNumber} of {totalPanels}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image container */}
        <div className="flex-1 flex items-center justify-center bg-black overflow-hidden min-h-96">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Expanded panel"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground">No image available</div>
          )}
        </div>

        {/* Footer with metadata and narrative */}
        {(imageModel || narrativeText) && (
          <div
            className="px-6 py-4 border-t space-y-3 max-h-32 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderColor: `${primaryColor}30` }}
          >
            {imageModel && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Generated with:</span>
                <span
                  className="text-xs font-mono px-2 py-1 rounded"
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  {imageModel}
                </span>
              </div>
            )}
            {narrativeText && (
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {narrativeText}
              </p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {onNavigate && (canNavigatePrev || canNavigateNext) && (
          <div className="flex items-center justify-between px-6 py-3 border-t" style={{ borderColor: `${primaryColor}30` }}>
            <button
              onClick={() => onNavigate('prev')}
              disabled={!canNavigatePrev}
              className="p-2 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('next')}
              disabled={!canNavigateNext}
              className="p-2 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
