'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { getWriterCoinById } from '@/lib/writerCoins'

interface BalanceData {
  balance: string
  decimals: number
  symbol: string
  formattedBalance: string
}

/**
 * Hook to fetch and cache user's writer coin balance (AVC)
 * Uses backend API to avoid exposing contract details to client
 */
export function useWriterCoinBalance() {
  const { address, isConnected } = useAccount()
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address || !isConnected) {
      setBalance(null)
      setError(null)
      return
    }

    const fetchBalance = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const writerCoin = getWriterCoinById('avc')
        if (!writerCoin) {
          throw new Error('Writer coin not configured')
        }

        // Call backend endpoint to get balance
        const response = await fetch(
          `/api/user/balance?wallet=${encodeURIComponent(address)}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch balance')
        }

        const data = await response.json()
        if (!data.success || !data.data) {
          throw new Error('Invalid response format')
        }
        setBalance({
          balance: data.data.balance,
          decimals: data.data.decimals || 18,
          symbol: data.data.symbol || 'AVC',
          formattedBalance: data.data.formattedBalance || '0',
        })
      } catch (err) {
        console.error('Failed to fetch writer coin balance:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
        setBalance(null)
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch immediately and then every 30 seconds
    fetchBalance()
    const interval = setInterval(fetchBalance, 30000)

    return () => clearInterval(interval)
  }, [address, isConnected])

  return { balance, isLoading, error }
}
