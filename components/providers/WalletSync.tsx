'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'

export function WalletSync() {
    const { address, isConnected } = useAccount()
    const router = useRouter()

    useEffect(() => {
        async function syncWallet() {
            if (isConnected && address) {
                try {
                    const response = await fetch('/api/auth/wallet', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ address }),
                    })

                    if (response.ok) {
                        console.log('Wallet synced successfully')
                        // Refresh the page data to reflect the new user state
                        router.refresh()
                    } else {
                        console.error('Failed to sync wallet')
                    }
                } catch (error) {
                    console.error('Error syncing wallet:', error)
                }
            }
        }

        syncWallet()
    }, [address, isConnected, router])

    return null
}
