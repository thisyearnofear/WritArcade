'use client'

import { useAccount, useChainId } from 'wagmi'
import { STORY_CHAIN_ID } from '@/lib/story-sdk-client'
import { motion } from 'framer-motion'
import { Globe, AlertCircle } from 'lucide-react'

// Known chain IDs
const BASE_MAINNET_CHAIN_ID = 8453
const BASE_SEPOLIA_CHAIN_ID = 84532

interface ChainInfo {
  name: string
  color: string
  bgColor: string
  purpose: string
  isSupported: boolean
}

function getChainInfo(chainId: number | undefined): ChainInfo {
  if (!chainId) {
    return {
      name: 'Not Connected',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      purpose: '',
      isSupported: false
    }
  }

  // Story Protocol (Aeneid Testnet)
  if (chainId === STORY_CHAIN_ID) {
    return {
      name: 'Story',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
      purpose: 'IP Registration',
      isSupported: true
    }
  }

  // Base Mainnet
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    return {
      name: 'Base',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      purpose: 'Payments',
      isSupported: true
    }
  }

  // Base Sepolia (Testnet)
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    return {
      name: 'Base Sepolia',
      color: 'text-blue-500 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      purpose: 'Testnet Payments',
      isSupported: true
    }
  }

  // Unknown/unsupported chain
  return {
    name: 'Unknown',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    purpose: 'Unsupported',
    isSupported: false
  }
}

/**
 * Network Indicator Component
 * 
 * Shows the current blockchain network the user is connected to.
 * Helps users understand cross-chain operations between:
 * - Base (for payments/purchases)
 * - Story Protocol (for IP registration)
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
            <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">
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
        chainInfo.isSupported 
          ? chainId === STORY_CHAIN_ID 
            ? 'bg-emerald-500' 
            : 'bg-blue-500'
          : 'bg-amber-500'
      }`} />
      <span className={chainInfo.color}>{chainInfo.name}</span>
    </div>
  )
}