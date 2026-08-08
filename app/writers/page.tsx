'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { CopyAddressButton } from '@/components/ui/copy-address-button'
import { motion } from 'framer-motion'
import { WRITER_COINS } from '@/lib/writer-coins'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'


export default function WritersPage() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Supported writers
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
              The writers behind the arcade
            </h1>
            <p className="text-muted-foreground max-w-xl leading-relaxed mb-12">
              Every game is generated from a real article. When you play or mint, the writer earns — automatically, on-chain.
            </p>

            <motion.ul
              className="divide-y divide-border"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            >
              {WRITER_COINS.map((coin) => (
                <motion.li
                  key={coin.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
                >
                  <Link
                    href={`/writers/${coin.id}`}
                    className="flex items-start justify-between gap-6 py-6 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-semibold text-foreground group-hover:text-muted-foreground transition-colors">
                          {coin.writer}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">${coin.symbol}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{coin.bio}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pt-1">
                      <CopyAddressButton
                        address={coin.address}
                        labelPrefix={`Copy ${coin.symbol}`}
                      />
                      <a
                        href={coin.paragraphUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Read ${coin.writer} on Paragraph`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">
                        →
                      </span>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
