import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #6b21a8 0%, #4c1d95 50%, #312e81 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          {/* Title */}
          <h1
            style={{
              fontSize: '80px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0',
              letterSpacing: '-2px',
            }}
          >
            writersarcade
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '42px',
              color: '#e9d5ff',
              margin: '0',
              fontWeight: '500',
            }}
          >
            Turn Articles into Playable Games
          </p>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginTop: '20px',
              fontSize: '28px',
              color: '#f3e8ff',
            }}
          >
            <div>🎮 Play</div>
            <div>🎨 Create</div>
            <div>💎 Mint</div>
          </div>

          {/* Footer text */}
          <p
            style={{
              fontSize: '24px',
              color: '#d8b4fe',
              margin: '30px 0 0 0',
              opacity: 0.9,
            }}
          >
            Powered by Base • Farcaster Native
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  )
}
