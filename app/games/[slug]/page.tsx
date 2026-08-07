import { notFound } from 'next/navigation'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { GamePlayInterface } from '@/domains/games/components/game-play-interface'
import { GameArtifactView } from '@/domains/games/components/game-artifact-view'
import { WordleGameInterface } from '@/domains/games/components/wordle-game-interface'
import { ImageGenerationService } from '@/domains/games/services/image-generation.service'
import { WordleService } from '@/domains/games/services/wordle.service'
import { IPAttribution } from '@/domains/games/components/ip-attribution'
import { GameOwnershipProgress } from '@/domains/games/components/game-ownership-progress'
import { PlayWelcomeCoach } from '@/components/onboarding/play-welcome-coach'
import { getSecretPanelStatus, formatSecretPanelDetail } from '@/lib/secret-panel-status'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { getActor } from '@/services/auth'

// Play mode includes viewer-specific ownership and insights capabilities, so
// avoid caching one visitor's owner state for other visitors. Read-only
// artifact pages can be split into a separately cached route later.
export const dynamic = 'force-dynamic'

interface GamePageProps {
  params: Promise<{
    slug: string
  }>
  searchParams?: Promise<{
    play?: string
    unlocked?: string
  }>
}

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const { slug } = await params
  const query = await searchParams
  const isPlayMode = query?.play === '1'
  const isUnlockShare = Boolean(query?.unlocked)
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game) {
    notFound()
  }

  const actor = await getActor()
  const viewerIsOwner = Boolean(
    actor && (
      (game.userId && game.userId === actor.user.id) ||
      (actor.user.walletAddress && (
        actor.user.walletAddress.toLowerCase() === game.ownerWallet?.toLowerCase() ||
        actor.user.walletAddress.toLowerCase() === game.creatorWallet?.toLowerCase()
      ))
    )
  )

  const siteUrl = getSiteUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.description,
    url: `${siteUrl}/games/${game.slug}`,
    gamePlatform: 'writersarcade',
    applicationCategory: 'Game',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: game.authorParagraphUsername || 'Anonymous',
    },
    datePublished: game.createdAt.toISOString(),
    image: game.imageUrl || `${siteUrl}/api/og-image`,
  }

  if (!isPlayMode && !isUnlockShare) {
    return (
      <ThemeWrapper theme="arcade">
        <div className="min-h-screen bg-black">
          <Header />
          <GameArtifactView game={game} />
          <Footer />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </div>
      </ThemeWrapper>
    )
  }

  // For story games, generate image if not exists (async, non-blocking)
  if (game.mode !== 'wordle' && !game.imageUrl) {
    ImageGenerationService.generateGameImage(game).then(result => {
      if (result.imageUrl) {
        GameDatabaseService.updateGameImage(game.id, result.imageUrl).catch(console.error)
      }
    }).catch(console.error)
  }

  // Wordle-mode games render a Wordle interface instead of the comic-story interface
  // The answer is NEVER stored in plaintext — read from Inco on the client
  if (game.mode === 'wordle') {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <GameOwnershipProgress game={game} variant="strip" />
        </div>
        <WordleGameInterface game={game} maxAttempts={WordleService.DEFAULT_MAX_ATTEMPTS} />
      </div>
    )
  }

  // Extract and flatten assets for the attribution component
   
  type LinkedAsset = { id: string; title: string; type: string; storyRegistration?: { storyIpId: string; status: string } | null }
  const gameWithAssets = game as typeof game & { gamesFromAssets?: { asset: LinkedAsset }[] }
  const linkedAssets = gameWithAssets.gamesFromAssets?.map((relation) => relation.asset) || []

  return (
    <div className="min-h-screen bg-black">
      {isUnlockShare && (
        <div className="border-b border-emerald-500/20 bg-emerald-950/35 px-4 py-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Vault unlocked</p>
              <h1 className="mt-1 text-lg font-semibold text-white">
                Someone unlocked the secret panel for {game.title}
              </h1>
              <p className="mt-1 text-sm text-emerald-100/75">
                This share link points to a token-gated epilogue protected by the game NFT and Inco.
              </p>
            </div>
            {game.promptVaultUuid && (
              <div className="rounded-md border border-emerald-500/20 bg-black/30 px-3 py-2 text-xs text-emerald-100">
                {formatSecretPanelDetail(getSecretPanelStatus(game))}
              </div>
            )}
          </div>
        </div>
      )}
      {linkedAssets.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <IPAttribution assets={linkedAssets} compact />
        </div>
      )}
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <GameOwnershipProgress game={game} variant="strip" />
      </div>
      <PlayWelcomeCoach gameSlug={game.slug} />
      <ErrorBoundary>
        <GamePlayInterface game={game} isOwner={viewerIsOwner} />
      </ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://writersarcade.vercel.app'
}

export async function generateMetadata({ params, searchParams }: GamePageProps) {
  if (!process.env.DATABASE_URL) {
    return {
      title: 'writersarcade Game',
      description: 'Play interactive games generated from articles',
    }
  }

  const { slug } = await params
  const game = await GameDatabaseService.getGameBySlug(slug)

  if (!game) {
    return {
      title: 'Game Not Found',
    }
  }

  const query = await searchParams
  const isUnlockShare = Boolean(query?.unlocked)
  const siteUrl = getSiteUrl()
  // Branded composite card (cover + title + genre + panel strip + Animated badge).
  const ogImage = isUnlockShare
    ? `${siteUrl}/api/games/${encodeURIComponent(slug)}/unlock-og`
    : `${siteUrl}/api/games/${encodeURIComponent(slug)}/og`

  return {
    title: isUnlockShare
      ? `Secret panel unlocked: ${game.title}`
      : `${game.title} - writersarcade`,
    description: isUnlockShare
      ? `A secret panel was unlocked for "${game.title}" on writersarcade.`
      : game.description,
    openGraph: {
      title: isUnlockShare ? `I unlocked the secret panel of ${game.title}` : game.title,
      description: isUnlockShare
        ? 'Verified unlock proof with vault UUID and gate NFT context.'
        : game.description,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: isUnlockShare ? `I unlocked the secret panel of ${game.title}` : game.title,
      description: isUnlockShare ? 'Verified unlock proof on writersarcade.' : game.description,
      images: [ogImage],
    },
  }
}
