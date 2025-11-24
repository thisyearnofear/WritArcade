import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/domains/users/components/auth-provider'
import { Web3Provider } from '@/components/providers/Web3Provider'
import { WalletSync } from '@/components/providers/WalletSync'
import { ToastProvider } from '@/components/ui/use-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WritArcade - Turn Articles into Mintable Games',
  description: 'Transform articles from newsletters and blogs into interactive, mintable games using AI',
  keywords: ['AI', 'games', 'articles', 'NFT', 'memecoin', 'newsletter'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        <Web3Provider>
          <ToastProvider>
            <WalletSync />
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ToastProvider>
        </Web3Provider>
      </body>
    </html>
  )
}