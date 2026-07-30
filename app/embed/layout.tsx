import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

// Bare shell for iframes — no header, footer nav, or wallet providers
// (ClientProvidersLoader swaps to EmbedProviders on /embed paths).
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-black">{children}</div>
}
