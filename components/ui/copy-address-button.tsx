'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyAddressButtonProps {
  address: string
  /** Tailwind size classes for the icon — defaults to w-3.5 h-3.5 */
  sizeClass?: string
  /** Accessible label prefix, e.g. "Copy $AVC" */
  labelPrefix?: string
}

/**
 * Minimal copy-to-clipboard button for contract addresses.
 * Shows a checkmark for 1.5s after copying, then reverts.
 */
export function CopyAddressButton({
  address,
  sizeClass = 'w-3.5 h-3.5',
  labelPrefix = 'Copy address',
}: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement('textarea')
      textarea.value = address
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [address])

  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        handleCopy()
      }}
      title={copied ? 'Copied!' : `${labelPrefix} ${shortAddress}`}
      aria-label={copied ? 'Copied' : `${labelPrefix} ${shortAddress}`}
      className="inline-flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
    >
      {copied ? (
        <Check className={`${sizeClass} text-green-500`} />
      ) : (
        <Copy className={sizeClass} />
      )}
    </button>
  )
}
