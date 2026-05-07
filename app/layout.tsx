import type { Metadata, Viewport } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import './globals.css'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'
import { ClientProvidersLoader } from '@/components/providers/ClientProvidersLoader'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif' })

// Viewport must be exported separately in Next.js 14+ (not nested inside metadata)
// Allow user scaling up to 5x for accessibility (WCAG 1.4.4 Resize Text)
// Double-tap zoom prevention is handled in JS (useMobileOptimizations hook)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  title: 'writersarcade — Interactive fiction from the writers you follow',
  description: 'Transform articles into interactive, mintable games. Support writers with their own coins, earn from plays, and own on-chain IP with configurable revenue splits.',
  keywords: ['interactive fiction', 'games', 'articles', 'NFT', 'writer coins', 'paragraph', 'farcaster', 'base', 'story protocol'],
  openGraph: {
    title: 'writersarcade — Interactive fiction from the writers you follow',
    description: 'Transform articles into interactive, mintable games. Support writers with their own coins and own on-chain IP.',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/api/og-image`,
        width: 1200,
        height: 630,
        alt: 'writersarcade',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'writersarcade — Interactive fiction from the writers you follow',
    description: 'Transform articles into interactive, mintable games. Support writers with their own coins and own on-chain IP.',
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/api/og-image`],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      {/* CONSOLIDATION: Use CSS variables for consistent theming */}
      <body className={`${inter.variable} ${sourceSerif.variable} font-sans bg-background text-foreground min-h-screen pb-16 md:pb-0`}>
        <ClientProvidersLoader>
          {children}
        </ClientProvidersLoader>
        <MobileBottomNav />
      </body>
    </html>
  )
}
