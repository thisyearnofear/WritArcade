import { ImageResponse } from 'next/og'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game) {
    return new Response('Game not found', { status: 404 })
  }

  const vaultLabel = game.promptVaultUuid
    ? `${game.promptVaultUuid.slice(0, 10)}...${game.promptVaultUuid.slice(-6)}`
    : 'CDR vault'
  const gateLabel = game.nftTokenId ? `Game NFT #${game.nftTokenId}` : 'Game NFT gate'

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
          fontFamily: 'Inter, Arial, sans-serif',
          overflow: 'hidden',
        }}
      >
        {game.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.imageUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.42,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.92), rgba(0,0,0,0.62), rgba(0,0,0,0.35))',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: '#34d399',
                boxShadow: '0 0 32px rgba(52, 211, 153, 0.7)',
              }}
            />
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#a7f3d0' }}>
              CDR Vault Unlocked
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900 }}>
            <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.06 }}>
              I unlocked the secret ending of
            </div>
            <div style={{ fontSize: 76, fontWeight: 950, lineHeight: 0.98, textWrap: 'balance' }}>
              {game.title}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 18, color: '#9ca3af' }}>Vault UUID</div>
                <div style={{ fontSize: 24, fontFamily: 'monospace', color: '#f9fafb' }}>{vaultLabel}</div>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 18, color: '#9ca3af' }}>Gate</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f9fafb' }}>{gateLabel}</div>
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>writersarcade</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
