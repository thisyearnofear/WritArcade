'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { PenLine, Menu, X, Moon, Sun, LayoutDashboard } from 'lucide-react'
import { useAccount } from 'wagmi'
import { isWhitelistedWriterCoin } from '@/lib/writerCoins'
import { Switch } from '@/components/ui/switch'
import { useDarkMode } from '@/components/providers/DarkModeProvider'
import { motion, useReducedMotion } from 'framer-motion'
import { NetworkIndicator, NetworkIndicatorCompact } from '@/components/layout/NetworkIndicator'

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

function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering the toggle on the client
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a placeholder to avoid layout shift (approximate width/height of toggle)
    return <div className="w-[70px] h-[24px]" aria-hidden="true" />
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="dark-mode-toggle"
        checked={isDarkMode}
        onCheckedChange={toggleDarkMode}
        className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-zinc-700"
      />
      <label htmlFor="dark-mode-toggle" className="text-sm text-gray-700 dark:text-gray-200">
        {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </label>
    </div>
  )
}

// Nav link definitions — single source of truth for desktop + mobile
const NAV_LINKS = [
  { href: '/games',    label: 'The Arcade' },
  { href: '/writers',  label: 'Writers' },
  { href: '/assets',   label: 'Marketplace' },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // Helper: is this link the current page?
  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-black/80 backdrop-blur-md relative z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo — use /logo.png (exists in /public); /images/logo-white.png does not exist */}
        <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
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
          <NetworkIndicator />
          <DarkModeToggle />
          <UserMenu />
        </nav>

        {/* Mobile Actions — ENHANCEMENT: Show balance, network, and user menu directly on mobile */}
        <div className="flex md:hidden items-center space-x-3">
          <NetworkIndicatorCompact />
          <BalanceDisplay />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
