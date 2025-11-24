'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  User,
  LogOut,
  Settings,
  GamepadIcon,
  Crown,
  Wallet
} from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'
import { WalletConnect } from '@/components/ui/wallet-connect'

export function UserMenu() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // TODO: Fetch Farcaster profile client-side using useFarcasterProfile hook
  const displayName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'User'

  const handleLogout = async () => {
    disconnect()
    setIsOpen(false)
    router.push('/')
  }

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-4">
        <WalletConnect />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {/* We keep the WalletConnect button visible for chain switching/account details */}
      <div className="hidden md:block">
        <WalletConnect />
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20">
              <div className="p-4 border-b border-gray-700">
                <div className="font-medium">{displayName}</div>
                <div className="text-xs text-purple-400 mt-1 font-mono">
                  {address}
                </div>
              </div>

              <div className="p-2">
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-800 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span>Preferences</span>
                </Link>

                <Link
                  href="/my-games"
                  className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-800 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <GamepadIcon className="w-4 h-4" />
                  <span>My Games</span>
                </Link>

                <hr className="my-2 border-gray-700" />

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-800 transition-colors text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}