import { prisma } from '@/lib/database'

export type GameRef = {
  id: string
  slug: string
  title: string
  genre: string
}

export type AttentionItem =
  | { kind: 'no-artifact'; game: GameRef }
  | { kind: 'private-ready'; game: GameRef }
  | { kind: 'not-minted'; game: GameRef }
  | { kind: 'not-registered'; game: GameRef }

export type RegisteredGame = {
  gameId: string
  slug: string
  title: string
  genre: string
  storyIpId: string
  storyRegisteredAt: string | null
}

export interface CreatorStudioSummary {
  games: {
    total: number
    public: number
    private: number
    minted: number
    storyRegistered: number
    artifactReady: number
    recent: GameRef[]
  }
  attention: AttentionItem[]
  payments: {
    generation: { musd: string; writerCoin: string }
    minting: { musd: string; writerCoin: string }
    byToken: Record<string, string>
  }
  ip: {
    storyGroupIpId: string | null
    registeredGames: RegisteredGame[]
    registeredCount: number
  }
  identity: {
    walletAddress: string
  }
}

const ATTENTION_LIMIT_PER_KIND = 5

function toRef(g: { id: string; slug: string; title: string; genre: string }): GameRef {
  return { id: g.id, slug: g.slug, title: g.title, genre: g.genre }
}

function formatUnits(raw: string | undefined | null, decimals = 18): string {
  if (!raw) return '0'
  return (Number(raw) / 10 ** decimals).toFixed(2)
}

/**
 * Single source of truth for the Creator Studio overview.
 *
 * Ownership: filtered by `Game.userId`, matching /my-games.
 * Payments: aggregated from the Payment table by action (generate-game | mint-nft).
 *   Labeled as "tracked payments" because these are wallet-side outflows,
 *   not inbound royalty revenue (which isn't attributed to games yet).
 */
export async function getCreatorStudioSummary(
  userId: string,
  walletAddress: string,
): Promise<CreatorStudioSummary> {
  const games = await prisma.game.findMany({
    where: { userId },
    select: {
      id: true,
      slug: true,
      title: true,
      genre: true,
      private: true,
      nftTokenId: true,
      storyIpId: true,
      artifactManifestUri: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const total = games.length
  const publicCount = games.filter((g) => !g.private).length
  const privateCount = total - publicCount
  const mintedCount = games.filter((g) => !!g.nftTokenId).length
  const storyRegisteredCount = games.filter((g) => !!g.storyIpId).length
  const artifactReadyCount = games.filter((g) => !!g.artifactManifestUri).length

  const noArtifact = games
    .filter((g) => !g.artifactManifestUri)
    .slice(0, ATTENTION_LIMIT_PER_KIND)
  const privateReady = games
    .filter((g) => g.private && !!g.artifactManifestUri)
    .slice(0, ATTENTION_LIMIT_PER_KIND)
  const notMinted = games
    .filter((g) => !!g.artifactManifestUri && !g.nftTokenId)
    .slice(0, ATTENTION_LIMIT_PER_KIND)
  const notRegistered = games
    .filter((g) => !!g.nftTokenId && !g.storyIpId)
    .slice(0, ATTENTION_LIMIT_PER_KIND)

  const attention: AttentionItem[] = [
    ...noArtifact.map<AttentionItem>((g) => ({ kind: 'no-artifact', game: toRef(g) })),
    ...privateReady.map<AttentionItem>((g) => ({ kind: 'private-ready', game: toRef(g) })),
    ...notMinted.map<AttentionItem>((g) => ({ kind: 'not-minted', game: toRef(g) })),
    ...notRegistered.map<AttentionItem>((g) => ({ kind: 'not-registered', game: toRef(g) })),
  ]

  const [musdGeneration, musdMinting, writerCoinGeneration, writerCoinMinting, paymentsByAction] =
    await Promise.all([
      prisma.payment.aggregate({
        where: {
          userId,
          writerCoinId: 'musd-testnet',
          action: 'generate-game',
          status: 'verified',
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          userId,
          writerCoinId: 'musd-testnet',
          action: 'mint-nft',
          status: 'verified',
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          userId,
          NOT: { writerCoinId: 'musd-testnet' },
          action: 'generate-game',
          status: 'verified',
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          userId,
          NOT: { writerCoinId: 'musd-testnet' },
          action: 'mint-nft',
          status: 'verified',
        },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['writerCoinId'],
        where: { userId, status: 'verified' },
        _sum: { amount: true },
      }),
    ])

  const byToken: Record<string, string> = {}
  for (const row of paymentsByAction) {
    byToken[row.writerCoinId] = formatUnits(row._sum.amount?.toString())
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { storyGroupIpId: true },
  })

  const registeredGamesRows = await prisma.game.findMany({
    where: {
      userId,
      storyIpId: { not: null },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      genre: true,
      storyIpId: true,
      storyRegisteredAt: true,
    },
    orderBy: { storyRegisteredAt: 'desc' },
    take: 20,
  })

  return {
    games: {
      total,
      public: publicCount,
      private: privateCount,
      minted: mintedCount,
      storyRegistered: storyRegisteredCount,
      artifactReady: artifactReadyCount,
      recent: games.slice(0, 5).map(toRef),
    },
    attention,
    payments: {
      generation: {
        musd: formatUnits(musdGeneration._sum.amount?.toString()),
        writerCoin: formatUnits(writerCoinGeneration._sum.amount?.toString()),
      },
      minting: {
        musd: formatUnits(musdMinting._sum.amount?.toString()),
        writerCoin: formatUnits(writerCoinMinting._sum.amount?.toString()),
      },
      byToken,
    },
    ip: {
      storyGroupIpId: user?.storyGroupIpId ?? null,
      registeredCount: registeredGamesRows.length,
      registeredGames: registeredGamesRows.map((g) => ({
        gameId: g.id,
        slug: g.slug,
        title: g.title,
        genre: g.genre,
        storyIpId: g.storyIpId!,
        storyRegisteredAt: g.storyRegisteredAt?.toISOString() ?? null,
      })),
    },
    identity: {
      walletAddress,
    },
  }
}
