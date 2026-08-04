import { ImageResponse } from 'next/og'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/** Dark arcade card shown when the game is missing or rendering fails. */
function renderFallback() {
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
            fontSize: 80,
            fontWeight: 900,
            letterSpacing: '-2px',
          }}
        >
          writersarcade
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontSize: 40,
            color: '#a78bfa',
            fontWeight: 600,
          }}
        >
          Turn articles into playable games
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
    return renderFallback()
  }

  if (!game) {
    return new Response('Game not found', { status: 404 })
  }

  // GameDatabaseService.getGameBySlug doesn't yet expose the video flag —
  // fetch it directly for the badge.
  let hasAnimation = false
  try {
    const meta = await prisma.game.findUnique({
      where: { slug },
      select: { videoUpsellStatus: true },
    })
    hasAnimation = meta?.videoUpsellStatus === 'completed'
  } catch {
    // If the flag can't be read, don't fail the whole card — render without badge.
    hasAnimation = false
  }

  const primaryColor = game.primaryColor || '#8b5cf6'

  // Panel strip: first 3 non-empty image URLs (1:1 thumbs under the title).
  const panelImages = (game.savedPanels ?? [])
    .flatMap((p) => (p?.imageUrl ? [p.imageUrl] : []))
    .slice(0, 3)

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
          {/* Cover art, faded to black so text stays readable regardless of art */}
          {game.imageUrl && (
            <img
              src={game.imageUrl}
              alt=''
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              background: `linear-gradient(135deg, ${primaryColor}26 0%, rgba(5,5,7,0.55) 40%, rgba(5,5,7,0.92) 100%)`,
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '100%',
              height: '100%',
              padding: 64,
            }}
          >
            {/* Brand row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#d8b4fe',
                  letterSpacing: '-0.5px',
                }}
              >
                writersarcade
              </div>
              {hasAnimation && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 999,
                    background: 'rgba(168,85,247,0.9)',
                    color: 'white',
                    fontSize: 18,
                    fontWeight: 700,
                    padding: '8px 16px',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  }}
                >
                  🎬 Animated
                </div>
              )}
            </div>

            {/* Title */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                maxWidth: 960,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 60,
                  fontWeight: 900,
                  lineHeight: 1.05,
                }}
              >
                {game.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 26,
                  color: '#d1d5db',
                }}
              >
                <span style={{ display: 'flex' }}>{game.genre}</span>
                <span style={{ display: 'flex', color: '#6b7280' }}>•</span>
                <span style={{ display: 'flex' }}>
                  {game.savedPanels?.length ?? 0} interactive panels
                </span>
              </div>
            </div>

            {/* Lower area: panel strip + writer attribution */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 24,
              }}
            >
              {panelImages.length > 0 ? (
                <div style={{ display: 'flex', gap: 14 }}>
                  {panelImages.map((url, i) => (
                    <img
                      key={`panel-${i}`}
                      src={url}
                      alt=''
                      width={152}
                      height={152}
                      style={{
                        width: 152,
                        height: 152,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '2px solid rgba(255,255,255,0.16)',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex' }} />
              )}
              <div style={{ display: 'flex', fontSize: 22, color: '#9ca3af' }}>
                An interactive comic on writersarcade
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
    console.error('[og] render failed', err)
    return renderFallback()
  }
}
