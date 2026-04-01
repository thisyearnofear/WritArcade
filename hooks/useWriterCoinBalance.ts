'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { getWriterCoinById } from '@/lib/writerCoins'

interface BalanceData {
  balance: string
  decimals: number
  symbol: string
  formattedBalance: string
}

/**
 * Hook to fetch and cache user's writer coin balance.
 * Uses backend API to avoid exposing contract details to client.
 */
export function useWriterCoinBalance(coinId = 'avc') {
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
        const writerCoin = getWriterCoinById(coinId)
        if (!writerCoin) {
          throw new Error(`Writer coin '${coinId}' not configured`)
        }

        // Call backend endpoint to get balance
        const response = await fetch(
          `/api/user/balance?wallet=${encodeURIComponent(address)}&coin=${encodeURIComponent(coinId)}`
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
          symbol: data.data.symbol || writerCoin.symbol,
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
  }, [address, isConnected, coinId])

  const refresh = useCallback(async () => {
    if (!address || !isConnected) {
      setBalance(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const writerCoin = getWriterCoinById(coinId)
      if (!writerCoin) {
        throw new Error(`Writer coin '${coinId}' not configured`)
      }

      const response = await fetch(
        `/api/user/balance?wallet=${encodeURIComponent(address)}&coin=${encodeURIComponent(coinId)}`
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
        symbol: data.data.symbol || writerCoin.symbol,
        formattedBalance: data.data.formattedBalance || '0',
      })
    } catch (err) {
      console.error('Failed to fetch writer coin balance:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected, coinId])

  return { balance, isLoading, error, refresh }
}
