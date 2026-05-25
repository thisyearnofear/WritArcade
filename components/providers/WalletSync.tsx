'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useWeb3Auth } from '@/components/providers/Web3Provider'

/**
 * Wallet Sync Provider
 * 
 * Syncs auth state changes to Next.js router
 * Triggered when RainbowKit completes SIWE flow or Disconnects
 */
export function WalletSync() {
  const { status } = useWeb3Auth()
  const router = useRouter()
  const prevStatus = useRef(status)

  useEffect(() => {
    if (prevStatus.current !== status) {
      if (status === 'authenticated') {
        console.log('[WalletSync] SIWE Login detected')
        const timer = setTimeout(() => router.refresh(), 300)
        prevStatus.current = status
        return () => clearTimeout(timer)
      } else if (status === 'unauthenticated' && prevStatus.current === 'authenticated') {
        console.log('[WalletSync] Logout detected')
        const timer = setTimeout(() => router.refresh(), 300)
        prevStatus.current = status
        return () => clearTimeout(timer)
      }
      prevStatus.current = status
    }
  }, [status, router])

  return null
}
