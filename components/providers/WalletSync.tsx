'use client'

import { useEffect, useRef } from 'react'
import { useWeb3Auth } from '@/components/providers/Web3Provider'

export function WalletSync() {
  const { status } = useWeb3Auth()
  const prevStatus = useRef(status)

  useEffect(() => {
    prevStatus.current = status
  }, [status])

  return null
}
