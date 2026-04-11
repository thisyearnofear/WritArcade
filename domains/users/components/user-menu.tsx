'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Settings,
  GamepadIcon,
  Wallet,
  MoreVertical,
  Circle,
  Moon,
  Sun
} from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'
import { useAccountModal } from '@rainbow-me/rainbowkit'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { getFarcasterProfile } from '@/lib/farcaster'
import type { FarcasterProfile } from '@/lib/farcaster'
import { useDarkMode } from '@/components/providers/DarkModeProvider'
import { NetworkIndicatorCompact } from '@/components/layout/NetworkIndicator'

interface UserMenuProps {
  mobileLayout?: boolean
}

export function UserMenu({ mobileLayout = false }: UserMenuProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openAccountModal } = useAccountModal()
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const kebabRef = useRef<HTMLButtonElement | null>(null)
  const [profile, setProfile] = useState<FarcasterProfile | null>(null)
  const [_isLoadingProfile, setIsLoadingProfile] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  // Fetch Farcaster profile when wallet connects
  useEffect(() => {
    if (!address || !isConnected) {
      setProfile(null)
      return
    }

    const loadProfile = async () => {
      setIsLoadingProfile(true)
      try {
        const farcasterProfile = await getFarcasterProfile(address)
        setProfile(farcasterProfile)
      } catch (error) {
        console.error('Failed to load Farcaster profile:', error)
        setProfile(null)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [address, isConnected])

  // Use Farcaster username if available, otherwise wallet address
  const displayName = profile?.username 
    ? `@${profile.username}` 
    : address 
      ? `${address.slice(0, 6)}...${address.slice(-4)}` 
      : 'User'
  
  const avatarUrl = profile?.pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${address || 'user'}`

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
    <div className="relative flex items-center gap-2">
      {/* Wallet chip -> RainbowKit account modal */}
      <button
        onClick={(e) => { e.preventDefault(); openAccountModal?.() }}
        className={`group flex items-center space-x-3 rounded-lg bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all ${
          mobileLayout ? 'px-4 py-3 space-x-4' : 'px-3 py-2'
        }`}
        aria-label="Manage wallet"
        title="Manage wallet"
      >
        {profile?.pfpUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className={mobileLayout ? 'w-10 h-10 rounded-full' : 'w-8 h-8 rounded-full'}
          />
        ) : (
          <div className={mobileLayout ? 'w-10 h-10' : 'w-8 h-8'}>
            <div className={`bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ${
              mobileLayout ? 'w-10 h-10' : 'w-8 h-8'
            }`}>
              <Wallet className={`${mobileLayout ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
            </div>
          </div>
        )}
        {mobileLayout ? (
          <div className="flex flex-col items-start min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-purple-300">
              <Circle className="w-2 h-2 fill-green-400 text-green-400" />
              Connected
            </span>
            <span className="group-hover:underline group-focus:underline cursor-pointer text-white text-base truncate"
              onClick={(e) => { e.preventDefault(); openAccountModal?.() }}
            >
              {displayName}
            </span>
          </div>
        ) : (
          <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400 shrink-0" />
        )}
      </button>

      {/* Kebab button -> open app menu */}
      <button
        ref={kebabRef}
        onClick={() => setIsOpen(!isOpen)}
        onBlur={(_e) => {
          // Close when focus leaves kebab and menu
          setTimeout(() => {
            const related = document.activeElement
            if (
              isOpen &&
              related !== kebabRef.current &&
              related !== menuRef.current &&
              !menuRef.current?.contains(related as Node)
            ) {
              setIsOpen(false)
            }
          }, 0)
        }}
        className={`p-2 rounded-md border border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-600/10 transition ${mobileLayout ? '' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open menu"
        title="Open menu"
      >
        <MoreVertical className="w-4 h-4 text-purple-300" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div 
            ref={menuRef} 
            className="absolute right-0 mt-4 w-72 max-w-[calc(100vw-2rem)] bg-gray-900 border border-purple-500/30 rounded-lg shadow-xl shadow-purple-500/10 z-[70] max-h-[80vh] overflow-auto md:right-0 sm:right-auto"
          >
            <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
              <div className="flex items-center space-x-3">
                {profile?.pfpUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{displayName}</div>
                </div>
              </div>
              {isConnected && (
                <div className="mt-2">
                  <NetworkIndicatorCompact />
                </div>
              )}
            </div>

            <div className="p-2 space-y-1">
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

              {mounted && (
                <>
                  <div className="my-1 border-t border-gray-700/50" />
                  <button
                    onClick={toggleDarkMode}
                    className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-purple-600/10 transition-colors group text-left"
                  >
                    {isDarkMode ? (
                      <Moon className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                    ) : (
                      <Sun className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                    )}
                    <span className="text-gray-300 group-hover:text-white">
                      {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
                    </span>
                  </button>
                </>
              )}

              <div className="my-1 border-t border-gray-700/50" />
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-600/10 transition-colors group text-left"
              >
                <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                <span className="text-gray-300 group-hover:text-white">Disconnect Wallet</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}