'use client'

import Link from 'next/link'
import { UserMenu } from '@/domains/users/components/user-menu'
import { BalanceDisplay } from '@/components/ui/balance-display'
import { PenLine, LayoutDashboard, Sun, Moon } from 'lucide-react'
import { useAccount } from 'wagmi'
import { motion, useReducedMotion } from 'framer-motion'
import { useIsActive } from '@/hooks/useIsActive'
import { useDarkMode } from '@/components/providers/DarkModeProvider'
import { Button } from '@/components/ui/button'

function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleDarkMode}
      className="text-muted-foreground hover:text-foreground"
    >
      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  )
}


function CreatorDashboardLink() {
  const { isConnected } = useAccount()
  if (!isConnected) return null
  return (
    <Link
      href="/creators/dashboard"
      className="flex items-center gap-1.5 text-sm font-bold text-amber-500 hover:text-amber-400 transition-colors"
    >
      <LayoutDashboard className="w-4 h-4" />
      <span className="uppercase tracking-widest text-[10px]">Hub</span>
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
        className={`relative transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded pb-0.5 ${
          isActive
            ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground/60 after:rounded-full'
            : 'text-muted-foreground hover:text-foreground'
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
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background ${
          isActive
            ? 'bg-accent border-border text-foreground'
            : 'bg-transparent border-border hover:bg-accent hover:border-foreground/20 text-muted-foreground hover:text-foreground'
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
    <header className="border-b border-border bg-background/95 backdrop-blur-md relative z-50">
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
          <ThemeToggle />
          <UserMenu />
        </nav>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center space-x-3">
          <ThemeToggle />
          <BalanceDisplay />
          <UserMenu mobileLayout />
        </div>
      </div>
    </header>
  )
}
