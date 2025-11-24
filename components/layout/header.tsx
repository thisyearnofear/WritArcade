'use client'

import Link from 'next/link'
import { UserMenu } from '@/domains/users/components/user-menu'
import { WalletConnectButton } from '@/components/game/WalletConnectButton'

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
            WritArcade
          </div>
        </Link>
        
        <nav className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/games" className="text-gray-300 hover:text-white transition-colors">
              Games
            </Link>
            <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/generate" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md transition-colors">
              Generate Game
            </Link>
          </div>
          
          {/* Wallet Connect */}
          <WalletConnectButton />
          
          {/* User Menu */}
          <UserMenu />
        </nav>
      </div>
    </header>
  )
}