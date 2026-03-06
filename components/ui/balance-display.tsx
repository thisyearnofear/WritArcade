'use client'

import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { useAccount } from 'wagmi'
import { Coins, Loader2 } from 'lucide-react'

interface BalanceDisplayProps {
  mobileLayout?: boolean
}

/**
 * Header balance display showing user's writer coin balance.
 * Only visible when wallet is connected.
 */
export function BalanceDisplay({ mobileLayout = false }: BalanceDisplayProps) {
  const { isConnected } = useAccount()
  const { balance, isLoading } = useWriterCoinBalance()

  if (!isConnected) {
    return null
  }

  const baseClasses = "flex items-center space-x-2 rounded-lg bg-purple-600/10 border border-purple-500/30"
  const textClasses = mobileLayout ? "text-base" : "text-sm"
  const paddingClasses = mobileLayout ? "px-4 py-3" : "px-3 py-2"

  return (
    <div className={`${baseClasses} ${paddingClasses}`}>
      {isLoading ? (
        <>
          <Loader2 className={`w-5 h-5 text-purple-400 animate-spin ${mobileLayout ? 'w-6 h-6' : 'w-4 h-4'}`} />
          <span className={`text-gray-400 ${textClasses}`}>Loading...</span>
        </>
      ) : balance ? (
        <>
          <Coins className={`text-purple-400 ${mobileLayout ? 'w-6 h-6' : 'w-4 h-4'}`} />
          <span className={`text-white font-medium ${textClasses}`}>{balance.formattedBalance}</span>
          <span className={`text-gray-400 ${textClasses}`}>{balance.symbol}</span>
        </>
      ) : (
        <>
          <Coins className={`text-gray-500 ${mobileLayout ? 'w-6 h-6' : 'w-4 h-4'}`} />
          <span className={`text-gray-400 ${textClasses}`}>—</span>
        </>
      )}
    </div>
  )
}
