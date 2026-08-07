"use client"

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '/games', label: 'Play · The Arcade' },
  { href: '/daily', label: 'Daily Challenge' },
  { href: '/generate', label: 'Create a game' },
  { href: '/studio', label: 'Creator insights' },
  { href: '/writers', label: 'Writers' },
  { href: '/my-games', label: 'My Games' },
  { href: '/assets', label: 'Advanced · Marketplace' },
  { href: '/#how-it-works', label: 'How it works' },
]

const BASE_GAME_NFT_ADDRESS =
  process.env.NEXT_PUBLIC_GAME_NFT_MAINNET ||
  process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS ||
  '0x32D0356f533cC429F94Db73f383bBb21a459E16b'

const BASE_WRITER_COIN_PAYMENT_ADDRESS =
  process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_MAINNET ||
  process.env.NEXT_PUBLIC_WRITER_COIN_PAYMENT_ADDRESS ||
  '0x56Ee5A3f122da00B635DdbB319708e24450aEB89'

const CONTRACT_LINKS = [
  {
    label: 'GameNFT',
    address: BASE_GAME_NFT_ADDRESS,
    href: `https://basescan.org/address/${BASE_GAME_NFT_ADDRESS}`,
  },
  {
    label: 'WriterCoinPayment',
    address: BASE_WRITER_COIN_PAYMENT_ADDRESS,
    href: `https://basescan.org/address/${BASE_WRITER_COIN_PAYMENT_ADDRESS}`,
  },
]

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/thisyearnofear/WritArcade' },
  { label: 'Farcaster', href: 'https://warpcast.com/~/channel/writarcade' },
]

function AnimatedFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.div whileHover={prefersReducedMotion ? {} : { x: 4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <Link href={href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {children}
      </Link>
    </motion.div>
  )
}

function AnimatedContractLink({ href, label }: { href: string; label: string }) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-primary text-xs font-mono flex items-center gap-1 transition-colors"
      whileHover={prefersReducedMotion ? {} : { scale: 1.02, x: 2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <span>{label}</span>
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
    </motion.a>
  )
}

function AnimatedExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors"
      whileHover={prefersReducedMotion ? {} : { x: 4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.a>
  )
}

export function Footer() {
  const [year, setYear] = useState<number | null>(null)

   
  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="border-t border-border bg-background/80 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <motion.p 
              className="text-foreground font-semibold mb-2"
              whileHover={{ scale: 1.02 }}
            >
              writersarcade
            </motion.p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Turn writing into playable experiences, then measure what readers choose and bring the story to life on-chain.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-foreground text-xs font-semibold uppercase tracking-wider mb-3">Explore</p>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <AnimatedFooterLink href={link.href}>{link.label}</AnimatedFooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contracts */}
          <div>
            <p className="text-foreground text-xs font-semibold uppercase tracking-wider mb-3">
              Contracts · Base Mainnet
            </p>
            <ul className="space-y-2">
              {CONTRACT_LINKS.map((c) => (
                <li key={c.label}>
                  <AnimatedContractLink href={c.href} label={c.label} />
                  <span className="text-muted-foreground text-xs font-mono">
                    {c.address.slice(0, 6)}…{c.address.slice(-4)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-foreground text-xs font-semibold uppercase tracking-wider mb-3">Community</p>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <AnimatedExternalLink href={link.href}>
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </AnimatedExternalLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>©{year ? ` ${year}` : ''} writersarcade. Built on Base · Story Protocol.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" aria-hidden="true" />
              Base Mainnet Live
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
