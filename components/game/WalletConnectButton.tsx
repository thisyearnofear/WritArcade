'use client'

import { useAccount, useConnectorClient } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

/**
 * Wallet connection button for web app
 * Wraps RainbowKit's ConnectButton with custom styling
 */
export function WalletConnectButton() {
  const { isConnected, address } = useAccount()

  return (
    <div className="flex items-center">
      <ConnectButton
        label={isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect Wallet'}
        accountStatus={isConnected ? 'full' : 'avatar'}
        chainStatus="name"
        showBalance={false}
      />
    </div>
  )
}
