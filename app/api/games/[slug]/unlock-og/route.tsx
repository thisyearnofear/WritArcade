import { ImageResponse } from 'next/og'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

export const runtime = 'nodejs'

function renderFallback(title: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#050507',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          padding: 64,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            color: '#a7f3d0',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: '#34d399',
            }}
          />
          Secret Panel Unlocked
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 900,
            textAlign: 'center',
            marginTop: 28,
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 24,
            color: '#9ca3af',
          }}
        >
          writersarcade
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let game
  try {
    game = await GameDatabaseService.getGameBySlug(slug)
  } catch {
    return renderFallback(slug.replace(/-/g, ' '))
  }

  if (!game) {
    return new Response('Game not found', { status: 404 })
  }

  const vaultLabel = game.promptVaultUuid
    ? game.promptVaultUuid.startsWith('inco:')
      ? `Inco #${game.promptVaultUuid.slice(5)}`
      : game.promptVaultUuid.length > 14
        ? `${game.promptVaultUuid.slice(0, 10)}...${game.promptVaultUuid.slice(-6)}`
        : game.promptVaultUuid
    : 'Inco'
  const gateLabel = game.nftTokenId ? `Game NFT #${game.nftTokenId}` : 'Game NFT gate'

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            background: '#050507',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,5,7,1) 60%)',
            }}
          />
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 64,
              width: '100%',
              height: '100%',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: '#34d399',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#a7f3d0',
                }}
              >
                Secret Panel Unlocked
              </div>
            </div>

            {/* Title block */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                maxWidth: 1000,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 44,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: '#d1d5db',
                }}
              >
                I unlocked the secret ending of
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 1.05,
                }}
              >
                {game.title}
              </div>
            </div>

            {/* Footer pills */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 28,
              }}
            >
              <div style={{ display: 'flex', gap: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 18, color: '#9ca3af' }}>
                    Vault UUID
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 24,
                      fontFamily: 'monospace',
                      color: '#f9fafb',
                      marginTop: 4,
                    }}
                  >
                    {vaultLabel}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 18, color: '#9ca3af' }}>
                    Gate
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#f9fafb',
                      marginTop: 4,
                    }}
                  >
                    {gateLabel}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', fontSize: 28, fontWeight: 900 }}>
                writersarcade
              </div>
            </div>
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
  } catch (err) {
    console.error('[unlock-og] render failed', err)
    return renderFallback(game.title)
  }
}
