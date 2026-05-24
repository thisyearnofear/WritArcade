'use client'

import { useAccount, useChainId } from 'wagmi'
import { motion } from 'framer-motion'
import { Globe, AlertCircle } from 'lucide-react'
import { getChainInfo } from '@/lib/chains'

/**
 * Network Indicator Component
 *
 * Shows the current blockchain network the user is connected to.
 * Helps users understand cross-chain operations between:
 * - Base (writer-coin payments)
 * - Mezo (MUSD payments)
 * - Story Protocol (IP registration)
 */
export function NetworkIndicator() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const chainInfo = getChainInfo(chainId)

  if (!isConnected) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium
        ${chainInfo.bgColor}
        transition-colors duration-200
      `}
    >
      {chainInfo.isSupported ? (
        <>
          <Globe className={`w-3.5 h-3.5 ${chainInfo.color}`} />
          <span className={chainInfo.color}>{chainInfo.name}</span>
          {chainInfo.purpose && (
            <span className="text-muted-foreground hidden sm:inline">
              · {chainInfo.purpose}
            </span>
          )}
        </>
      ) : (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400">
            Unsupported Network
          </span>
        </>
      )}
    </motion.div>
  )
}

/**
 * Compact version for mobile or tight spaces
 */
export function NetworkIndicatorCompact() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const chainInfo = getChainInfo(chainId)

  if (!isConnected) {
    return null
  }

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
        ${chainInfo.bgColor}
      `}
      title={`${chainInfo.name}${chainInfo.purpose ? ` - ${chainInfo.purpose}` : ''}`}
    >
      <div className={`w-2 h-2 rounded-full ${
        !chainInfo.isSupported
          ? 'bg-amber-500'
          : chainInfo.ecosystem === 'story'
            ? 'bg-emerald-500'
            : chainInfo.ecosystem === 'mezo'
              ? 'bg-amber-400'
              : 'bg-blue-500'
      }`} />
      <span className={chainInfo.color}>{chainInfo.name}</span>
    </div>
  )
}