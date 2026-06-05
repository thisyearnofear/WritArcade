'use client'

import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { MezoAnalytics } from '@/components/mezo/MezoAnalytics'
import { Zap } from 'lucide-react'

export function MezoAnalyticsClient() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground">
                  Mezo Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Live on-chain data from the MezoBoostedSplitter contract
                </p>
              </div>
            </div>

            <div className="mt-8">
              <MezoAnalytics />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </ThemeWrapper>
  )
}
