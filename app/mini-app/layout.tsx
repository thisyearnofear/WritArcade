import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WritArcade - Mini App',
  description: 'Turn articles into playable games',
  openGraph: {
    title: 'WritArcade',
    description: 'Turn articles into playable games',
    images: [
      {
        url: 'https://writarcade.vercel.app/android-chrome-192x192.png',
        width: 192,
        height: 192,
      },
    ],
  },
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Mini App Embed Metadata - Required for feed discovery */}
      <meta
        name="fc:miniapp"
        content={JSON.stringify({
          version: '1',
          imageUrl: 'https://writarcade.vercel.app/android-chrome-192x192.png',
          button: {
            title: 'Play WritArcade',
            action: {
              type: 'launch_miniapp',
              name: 'WritArcade',
              url: 'https://writarcade.vercel.app/mini-app',
              splashImageUrl: 'https://writarcade.vercel.app/android-chrome-192x192.png',
              splashBackgroundColor: '#1a1a2e',
            },
          },
        })}
      />
      {children}
    </>
  )
}
