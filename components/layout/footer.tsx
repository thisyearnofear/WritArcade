"use client"

import Link from 'next/link'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '/games', label: 'Play · The Arcade' },
  { href: '/generate', label: 'Create a game' },
  { href: '/studio', label: 'Creator insights' },
  { href: '/my-games', label: 'My Games' },
]

const MORE_LINKS = [
  { href: '/daily', label: 'Daily Challenge' },
  { href: '/writers', label: 'Writers' },
  { href: '/assets', label: 'Marketplace' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <motion.p
              className="text-foreground font-semibold mb-2"
              whileHover={{ scale: 1.02 }}
            >
              writersarcade
            </motion.p>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
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
            <details className="group mt-2">
              <summary className="inline-flex cursor-pointer list-none select-none items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                More
                <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-2 space-y-2">
                {MORE_LINKS.map((link) => (
                  <li key={link.href}>
                    <AnimatedFooterLink href={link.href}>{link.label}</AnimatedFooterLink>
                  </li>
                ))}
              </ul>
            </details>
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
        <div className="border-t border-border pt-6 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>©{year ? ` ${year}` : ''} writersarcade. Built on Base · Story Protocol.</span>
          <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Contracts · Base Mainnet:</span>
            <a href={`https://basescan.org/address/${BASE_GAME_NFT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors">
              GameNFT <ExternalLink className="w-3 h-3" />
            </a>
            <span aria-hidden="true">·</span>
            <a href={`https://basescan.org/address/${BASE_WRITER_COIN_PAYMENT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors">
              WriterCoinPayment <ExternalLink className="w-3 h-3" />
            </a>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" aria-hidden="true" />
            Base Mainnet Live
          </span>
        </div>
      </div>
    </footer>
  )
}
