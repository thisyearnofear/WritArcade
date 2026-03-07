'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { WRITER_COINS } from '@/lib/writerCoins'
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
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500 mb-4">
              Supported writers
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              The writers behind the arcade
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed mb-12">
              Every game is generated from a real article. When you play or mint, the writer earns — automatically, on-chain.
            </p>

            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {WRITER_COINS.map((coin) => (
                <li key={coin.id}>
                  <Link
                    href={`/writers/${coin.id}`}
                    className="flex items-start justify-between gap-6 py-6 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
                          {coin.writer}
                        </span>
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-600">${coin.symbol}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{coin.bio}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pt-1">
                      <a
                        href={coin.paragraphUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        aria-label={`Read ${coin.writer} on Paragraph`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <span className="text-gray-400 dark:text-gray-600 group-hover:text-gray-700 dark:group-hover:text-gray-400 transition-colors text-sm">
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </main>

        <Footer />
      </div>
    </ThemeWrapper>
  )
}
