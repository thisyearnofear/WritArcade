import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'

export const metadata: Metadata = {
  title: 'writersarcade - Turn Articles into Games',
  description: 'Generate AI-powered games from articles using writer coins. Play, mint, and earn on Base.',
  openGraph: {
    title: 'writersarcade',
    description: 'Turn articles into mintable games',
    images: [
      {
        url: `${siteUrl}/og`,
        width: 1200,
        height: 630,
        alt: 'writersarcade - Article Games',
      },
    ],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: `${siteUrl}/og`,
      button: {
        title: 'Launch writersarcade',
        action: {
          type: 'launch_frame',
          name: 'writersarcade',
          url: 'https://writersarcade.vercel.app/mini-app',
          splashImageUrl: 'https://writersarcade.vercel.app/android-chrome-192x192.png',
          splashBackgroundColor: '#1a1a2e',
        },
      },
    }),
  },
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -inset-[100%] opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-[128px] animate-pulse [animation-delay:2s]"></div>
        </div>
        <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>
      
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}

