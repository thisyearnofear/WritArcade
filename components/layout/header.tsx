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
      <label htmlFor="dark-mode-toggle" className="text-sm text-gray-300">
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
        className={`relative transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black rounded pb-0.5 ${
          isActive
            ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white/60 after:rounded-full'
            : 'text-gray-400 hover:text-white'
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
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black ${
          isActive
            ? 'bg-white/10 border-white/20 text-white'
            : 'bg-transparent border-gray-700 hover:bg-white/5 hover:border-gray-500 text-gray-300 hover:text-white'
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
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur relative z-50">
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
          <DarkModeToggle />
          <UserMenu />
        </nav>

        {/* Mobile Menu Button */}
        <motion.button
          onClick={() => setIsMobileMenuOpen(v => !v)}
          className="md:hidden p-3 rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          whileTap={{ scale: 0.95 }}
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </motion.button>
      </div>

      {/* Transparent backdrop — tap outside to dismiss mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden relative z-50 bg-black/95 backdrop-blur-lg border-t border-gray-800"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
        >
          <div className="px-4 py-4 space-y-2">
            <h3 id="mobile-menu-title" className="sr-only">Mobile Navigation</h3>

            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                aria-current={isActive(href) ? 'page' : undefined}
                className={`block py-3 px-4 rounded-lg transition-colors text-base focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black ${
                  isActive(href)
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            ))}

            <Link
              href="/generate"
              onClick={closeMobileMenu}
              aria-current={isActive('/generate') ? 'page' : undefined}
              className={`flex items-center space-x-2 py-3 px-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black ${
                isActive('/generate')
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-gray-700 hover:bg-white/5 text-gray-300 hover:text-white'
              }`}
            >
              <PenLine className="w-4 h-4" />
              <span>Create</span>
            </Link>

            <div className="pt-3 border-t border-gray-800">
              <BalanceDisplay mobileLayout={true} />
            </div>
            <div className="pt-3">
              <DarkModeToggle />
            </div>
            <div className="pt-3">
              <UserMenu mobileLayout={true} />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
