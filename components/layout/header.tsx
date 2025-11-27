'use client'

import Link from 'next/link'
import { UserMenu } from '@/domains/users/components/user-menu'

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
          <Link href="/games" className="text-gray-300 hover:text-white transition-colors">
            Games
          </Link>
          <UserMenu />
        </nav>
      </div>
    </header>
  )
}