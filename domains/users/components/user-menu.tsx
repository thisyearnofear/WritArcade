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

  // When not connected, show wallet connect button
  if (!isConnected) {
    return (
      <div className="flex items-center">
        <WalletConnect />
      </div>
    )
  }

  // When connected, show unified wallet + user menu
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-xs text-purple-300 font-medium">Connected</span>
          <span className="text-sm font-mono text-white">{displayName}</span>
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
          <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-purple-500/30 rounded-lg shadow-xl shadow-purple-500/10 z-20">
            <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{displayName}</div>
                  <div className="text-xs text-purple-300 mt-1 font-mono truncate">
                    {address}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/profile"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-purple-600/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                <span className="text-gray-300 group-hover:text-white">Preferences</span>
              </Link>

              <Link
                href="/my-games"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-purple-600/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <GamepadIcon className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                <span className="text-gray-300 group-hover:text-white">My Games</span>
              </Link>

              <hr className="my-2 border-gray-700" />

              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-500/10 transition-colors group"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="text-red-400 group-hover:text-red-300">Disconnect Wallet</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}