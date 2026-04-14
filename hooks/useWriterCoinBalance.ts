'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAccount } from 'wagmi'
import { getWriterCoinById } from '@/lib/writerCoins'

interface BalanceData {
  balance: string
  decimals: number
  symbol: string
  formattedBalance: string
}

const BACKEND_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || `${window.location.origin}`)
  : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.snel.famile.xyz/writersarcade'

/**
 * Hook to fetch and cache user's writer coin balance.
 * Uses backend API to avoid exposing contract details to client.
 * Implements intelligent caching to reduce RPC calls.
 */
export function useWriterCoinBalance(coinId = 'avc') {
  const { address, isConnected } = useAccount()
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, { data: BalanceData; timestamp: number }>>(new Map())
  const CACHE_DURATION = 30000 // 30 seconds cache

  const fetchBalance = useCallback(async (wallet: string, coin: string) => {
    const cacheKey = `${wallet}-${coin}`
    const cached = cacheRef.current.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    try {
      const writerCoin = getWriterCoinById(coin)
      if (!writerCoin) {
        throw new Error(`Writer coin '${coin}' not configured`)
      }

      const response = await fetch(
        `${BACKEND_URL}/api/user/balance?wallet=${encodeURIComponent(wallet)}&coin=${encodeURIComponent(coin)}`,
        { credentials: 'include' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch balance')
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        throw new Error('Invalid response format')
      }

      const balanceData = {
        balance: data.data.balance,
        decimals: data.data.decimals || 18,
        symbol: data.data.symbol || writerCoin.symbol,
        formattedBalance: data.data.formattedBalance || '0',
      }

      cacheRef.current.set(cacheKey, { data: balanceData, timestamp: Date.now() })

      return balanceData
    } catch (err) {
      console.error('Failed to fetch writer coin balance:', err)
      throw err
    }
  }, [])

  useEffect(() => {
    if (!address || !isConnected) {
      setBalance(null)
      setError(null)
      cacheRef.current.clear()
      return
    }

    const fetchAndCache = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const balanceData = await fetchBalance(address, coinId)
        setBalance(balanceData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
        setBalance(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAndCache()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchBalance(address, coinId)
      }
    }, 120000) // Poll every 2 minutes instead of 60 seconds

    return () => clearInterval(interval)
  }, [address, isConnected, coinId, fetchBalance])

  const refresh = useCallback(async () => {
    if (!address || !isConnected) {
      setBalance(null)
      return
    }

    // Clear cache for this wallet/coin to force fresh fetch
    cacheRef.current.delete(`${address}-${coinId}`)
    
    setIsLoading(true)
    setError(null)

    try {
      const balanceData = await fetchBalance(address, coinId)
      setBalance(balanceData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected, coinId, fetchBalance])

  return { balance, isLoading, error, refresh }
}
