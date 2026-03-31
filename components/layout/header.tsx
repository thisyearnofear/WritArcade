'use client'

import Link from 'next/link'
import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { PenLine, LayoutDashboard } from 'lucide-react'
import { useAccount } from 'wagmi'
import { isWhitelistedWriterCoin } from '@/lib/writerCoins'
import { motion, useReducedMotion } from 'framer-motion'
import { useIsActive } from '@/hooks/useIsActive'

function CreatorDashboardLink() {
  const { address, isConnected } = useAccount()
  if (!isConnected || !address || !isWhitelistedWriterCoin(address)) return null
  return (
    <Link
      href="/creators/dashboard"
      className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
    >
      <LayoutDashboard className="w-4 h-4" />
      <span>Dashboard</span>
    </Link>
  )
}

// Nav link definitions — single source of truth for desktop + mobile
const NAV_LINKS = [
  { href: '/games',    label: 'Arcade' },
  { href: '/writers',  label: 'Writers' },
  { href: '/assets',   label: 'Market' },
  { href: '/my-games', label: 'My Games' },
]

function AnimatedNavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.div
      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
    >
      <Link
        href={href}
        className={`relative transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black rounded pb-0.5 ${
          isActive
            ? 'text-gray-900 dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900/60 dark:after:bg-white/60 after:rounded-full'
            : 'text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
      </Link>
    </motion.div>
  )
}

function AnimatedCreateButton({ isActive }: { isActive: boolean }) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.div
      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
    >
      <Link
        href="/generate"
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black ${
          isActive
            ? 'bg-gray-900/10 dark:bg-white/10 border-gray-900/20 dark:border-white/20 text-gray-900 dark:text-white'
            : 'bg-transparent border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <PenLine className="w-4 h-4" />
        <span>Create</span>
      </Link>
    </motion.div>
  )
}

export function Header() {
  const isActive = useIsActive()

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-black/80 backdrop-blur-md relative z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <motion.img 
            src="/logo.png" 
            alt="writersarcade" 
            className="h-8 w-auto"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {NAV_LINKS.map(({ href, label }) => (
            <AnimatedNavLink key={href} href={href} label={label} isActive={isActive(href)} />
          ))}

          <AnimatedCreateButton isActive={isActive('/generate')} />

          <CreatorDashboardLink />
          <BalanceDisplay />
          <UserMenu />
        </nav>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center space-x-3">
          <BalanceDisplay />
          <UserMenu mobileLayout />
        </div>
      </div>
    </header>
  )
}
