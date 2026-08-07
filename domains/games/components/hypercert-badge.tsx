'use client'

import { motion } from 'framer-motion'
import { Award, ExternalLink } from 'lucide-react'

interface HypercertBadgeProps {
  hypercertUri?: string | null
  _hypercertCid?: string | null
  _gameTitle?: string
  compact?: boolean
}

export function HypercertBadge({
  hypercertUri,
  compact = false,
}: HypercertBadgeProps) {
  if (!hypercertUri) return null

  // Extract the DID from the AT Protocol URI for display
  const didMatch = hypercertUri.match(/at:\/\/(did:plc:[^/]+)/)
  const shortDid = didMatch
    ? `${didMatch[1].slice(0, 16)}...${didMatch[1].slice(-6)}`
    : 'certified'

  // Build Hyperscan URL for viewing the hypercert
  const hyperscanUrl = hypercertUri
    ? `https://hyperscan.dev/record/${encodeURIComponent(hypercertUri)}`
    : null

  if (compact) {
    return (
      <a
        href={hyperscanUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
        title="Impact certificate on Hypercerts"
      >
        <Award className="w-3.5 h-3.5" />
        <span>Optional impact certificate</span>
        <ExternalLink className="w-2.5 h-2.5 opacity-50" />
      </a>
    )
  }

  return (
    <motion.a
      href={hyperscanUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
        <Award className="w-4 h-4 text-amber-400" />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-amber-300">
            Optional impact certificate
          </span>
          <ExternalLink className="w-3 h-3 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
        </div>
        <p className="text-[11px] text-amber-400/50 truncate max-w-[200px]">
          {shortDid}
        </p>
      </div>
    </motion.a>
  )
}
