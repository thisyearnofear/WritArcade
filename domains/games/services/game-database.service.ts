import { prisma } from '@/lib/database'
import { createSlug } from '@/lib/utils'
import type { Game, GameGenerationResponse, GameMode, SavedGamePanel } from '../types'
import { Prisma, Game as PrismaGameModel } from '@prisma/client'

type GameChatSnapshot = {
  id: string
  role: string
  content: string
  sessionId: string
  parentId: string | null
  model: string
  createdAt: Date
}

type GameArtifactPanelSnapshot = {
  id: string
  panelIndex: number
  narrativeText: string
  imageUrl: string | null
  imageModel: string | null
  userChoice: string | null
  audioUrl: string | null
  createdAt: Date
}

/**
 * Game Database Service
 * Handles all game-related database operations
 */
export class GameDatabaseService {

  /**
    * Create a new game from AI generation response
    */
  static async createGame(
    gameData: GameGenerationResponse,
    userId?: string,
    miniAppData?: {
      articleUrl?: string
      writerCoinId?: string
      difficulty?: string
      articleContext?: string
      wordleAnswerVaultUuid?: string
      authorParagraphUsername?: string
      authorWallet?: string
      publicationName?: string
      publicationSummary?: string
      subscriberCount?: number
      articlePublishedAt?: Date
      ownerWallet?: string
      ownershipSource?: string
      paymentId?: string
    },
    assetIds?: string[] // Links to parent assets (Workshop Packs)
  ): Promise<Game> {
    try {
      // Generate unique slug
      let slug = createSlug(gameData.title)

      // Check if slug exists and make unique if needed
      const existingGame = await prisma.game.findUnique({
        where: { slug }
      })

      if (existingGame) {
        slug = `${slug}-${Date.now()}`
      }

      const gameCreateData: Prisma.GameUncheckedCreateInput = {
        title: gameData.title,
        slug,
        description: gameData.description,
        tagline: gameData.tagline,
        genre: gameData.genre,
        subgenre: gameData.subgenre,
        primaryColor: gameData.primaryColor,
        mode: (gameData.mode as GameMode | undefined) || 'story',
        promptName: gameData.promptName,
        promptText: gameData.promptText,
        promptModel: gameData.promptModel,
        articleUrl: miniAppData?.articleUrl,
        articleContext: miniAppData?.articleContext,
        writerCoinId: miniAppData?.writerCoinId,
        difficulty: miniAppData?.difficulty,
        authorParagraphUsername: miniAppData?.authorParagraphUsername,
        authorWallet: miniAppData?.authorWallet,
        publicationName: miniAppData?.publicationName,
        publicationSummary: miniAppData?.publicationSummary,
        subscriberCount: miniAppData?.subscriberCount,
        articlePublishedAt: miniAppData?.articlePublishedAt,
        ownerWallet: miniAppData?.ownerWallet || gameData.ownerWallet,
        ownershipSource: miniAppData?.ownershipSource || gameData.ownershipSource,
        creatorWallet: gameData.creatorWallet,
        paymentId: miniAppData?.paymentId || gameData.paymentId,
        private: false,
        userId: userId || null,
        wordleAnswerVaultUuid: miniAppData?.wordleAnswerVaultUuid,
        promptVaultUuid: gameData.promptVaultUuid,
      }

      // Add asset relations if provided
      if (assetIds && assetIds.length > 0) {
        gameCreateData.gamesFromAssets = {
          create: assetIds.map(assetId => ({
            asset: { connect: { id: assetId } },
            userId: userId || 'anonymous',
            compositionPrompt: 'Workshop Compilation',
            tokensSpent: 0
          }))
        }
      }

      const game = await prisma.game.create({ data: gameCreateData })

      console.log('Game created successfully:', { id: game.id, slug: game.slug })
      return this.mapPrismaGameToGame(game)

    } catch (error) {
      console.error('Failed to create game:', error)
      console.error('Game creation error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as { code?: string }).code,
        meta: (error as { meta?: Record<string, unknown> }).meta,
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw new Error('Failed to save game to database')
    }
  }

  /**
   * Get game by slug
   */
  static async getGameBySlug(slug: string): Promise<Game | null> {
    try {
      const game = await prisma.game.findUnique({
        where: { slug },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
            }
          },
          payment: {
            select: {
              writerCoinId: true,
            },
          },
          chats: {
            select: {
              id: true,
              role: true,
              content: true,
              sessionId: true,
              parentId: true,
              model: true,
              createdAt: true,
            },
            where: {
              role: {
                in: ['assistant', 'user'],
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          artifactPanels: {
            select: {
              id: true,
              panelIndex: true,
              narrativeText: true,
              imageUrl: true,
              imageModel: true,
              userChoice: true,
              audioUrl: true,
              createdAt: true,
            },
            orderBy: {
              panelIndex: 'asc',
            },
          },

          gamesFromAssets: {
            include: {
              asset: {
                include: {
                  storyRegistration: true
                }
              }
            }
          }
        }
      })

      return game ? this.mapPrismaGameToGame(game) : null

    } catch (error) {
      console.error('Failed to get game by slug:', error)
      return null
    }
  }

  /**
   * Get games with pagination and filtering
   */
  static async getGames(options: {
    limit?: number
    offset?: number
    search?: string
    genre?: string
    userId?: string
    writerCoinId?: string
    includePrivate?: boolean
    featured?: boolean
    requireFunding?: boolean
    requireImage?: boolean
    requireArtifact?: boolean
  } = {}) {
    const {
      limit = 25,
      offset = 0,
      search,
      genre,
      userId,
      writerCoinId,
      includePrivate = false,
      featured,
      requireFunding = false,
      requireImage = false,
      requireArtifact = false
    } = options

    try {
      // Build where clause
      const where: Prisma.GameWhereInput = {
        AND: [
          // Privacy filter
          includePrivate ? {} : { private: false },
          // User filter
          userId ? { userId } : {},
          // Featured filter - Cast to any until schema regen propagates
          featured ? { featured: true } as Partial<Game> : {},
          // Search filter
          search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { genre: { contains: search, mode: 'insensitive' } },
              { subgenre: { contains: search, mode: 'insensitive' } },
            ]
          } : {},
          // Genre filter
          genre ? { genre: { equals: genre, mode: 'insensitive' } } : {},
          // Writer coin filter
          writerCoinId ? { writerCoinId } : {},
          // Public showcase quality filters. Legacy games without funding
          // provenance are playable, but should not be promoted into mint flows.
          requireFunding ? {
            OR: [
              { writerCoinId: { not: null } },
              { payment: { isNot: null } },
            ],
          } : {},
          requireImage ? {
            imageUrl: { not: null },
          } : {},
          requireArtifact ? {
            OR: [
              { artifactManifestUri: { not: null } },
              { artifactPanels: { some: {} } },
              { nftTokenId: { not: null } },
              { nftTransactionHash: { not: null } },
              { storyIpId: { not: null } },
            ],
          } : {},
        ]
      }

      const [games, total] = await Promise.all([
        prisma.game.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                walletAddress: true,
              }
            },
            payment: {
              select: {
                writerCoinId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.game.count({ where })
      ])

      return {
        games: games.map(this.mapPrismaGameToGame),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }

    } catch (error) {
      console.error('Failed to get games:', error)
      // Return empty result instead of throwing on database errors
      return {
        games: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
      }
    }
  }

  /**
   * Get games by genre
   */
  static async getGamesByGenre(genre: string, limit: number = 25) {
    return this.getGames({ genre, limit, includePrivate: false })
  }

  /**
   * Get user's games
   */
  static async getUserGames(userId: string, limit: number = 25) {
    return this.getGames({ userId, limit, includePrivate: true })
  }

  /**
   * Update game
   */
  static async updateGame(
    id: string,
    updates: Partial<Pick<Game, 'title' | 'description' | 'tagline' | 'private' | 'playFee'>>
  ): Promise<Game | null> {
    try {
      const game = await prisma.game.update({
        where: { id },
        data: updates,
      })

      return this.mapPrismaGameToGame(game)

    } catch (error) {
      console.error('Failed to update game:', error)
      return null
    }
  }

  /**
   * Update game image URL
   */
  static async updateGameImage(id: string, imageUrl: string): Promise<Game | null> {
    try {
      const game = await prisma.game.update({
        where: { id },
        data: { imageUrl },
      })

      return this.mapPrismaGameToGame(game)

    } catch (error) {
      console.error('Failed to update game image:', error)
      return null
    }
  }

  /**
   * Delete game
   */
  static async deleteGame(id: string, userId: string): Promise<boolean> {
    try {
      await prisma.game.delete({
        where: {
          id,
          userId, // Ensure user owns the game
        }
      })

      return true

    } catch (error) {
      console.error('Failed to delete game:', error)
      return false
    }
  }

  /**
   * Get game statistics
   */
  static async getGameStats() {
    try {
      const [
        totalGames,
        publicGames,
        genres,
        recentGames
      ] = await Promise.all([
        prisma.game.count(),
        prisma.game.count({ where: { private: false } }),
        prisma.game.groupBy({
          by: ['genre'],
          _count: { genre: true },
          orderBy: { _count: { genre: 'desc' } },
          take: 10,
        }),
        prisma.game.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            }
          }
        })
      ])

      return {
        totalGames,
        publicGames,
        topGenres: genres.map(g => ({ genre: g.genre, count: g._count.genre })),
        recentGames,
      }

    } catch (error) {
      console.error('Failed to get game stats:', error)
      return {
        totalGames: 0,
        publicGames: 0,
        topGenres: [],
        recentGames: 0,
      }
    }
  }

  /**
   * Map Prisma game model to our Game type
   */
  private static mapPrismaGameToGame(prismaGame: PrismaGameModel): Game {
    const gameWithArtifacts = prismaGame as PrismaGameModel & {
      chats?: GameChatSnapshot[]
      artifactPanels?: GameArtifactPanelSnapshot[]
      nftMetadataUri?: string | null
      gameMetadataUri?: string | null
      artifactManifestUri?: string | null
      artifactSavedAt?: Date | null
    }
    const artifactPanels = this.mapArtifactPanels(gameWithArtifacts.artifactPanels || [])
    const savedPanels = artifactPanels.length
      ? artifactPanels
      : this.extractSavedPanelsFromChats(gameWithArtifacts.chats || [])

    return {
      id: prismaGame.id,
      title: prismaGame.title,
      slug: prismaGame.slug,
      description: prismaGame.description,
      tagline: prismaGame.tagline,
      genre: prismaGame.genre,
      subgenre: prismaGame.subgenre,
      primaryColor: prismaGame.primaryColor || undefined,
      mode: (prismaGame.mode as GameMode | undefined) || 'story',
      promptName: prismaGame.promptName,
      promptText: prismaGame.promptText || undefined,
      promptModel: prismaGame.promptModel,
      imageUrl: prismaGame.imageUrl || undefined,
      imagePromptModel: prismaGame.imagePromptModel || undefined,
      imagePromptName: prismaGame.imagePromptName || undefined,
      imagePromptText: prismaGame.imagePromptText || undefined,
      imageData: prismaGame.imageData || undefined,
      musicPromptText: prismaGame.musicPromptText || undefined,
      musicPromptSeedImage: prismaGame.musicPromptSeedImage || undefined,
      articleUrl: prismaGame.articleUrl || undefined,
      articleContext: prismaGame.articleContext || undefined,
      writerCoinId: prismaGame.writerCoinId || (prismaGame as { payment?: { writerCoinId?: string | null } | null }).payment?.writerCoinId || undefined,
      difficulty: prismaGame.difficulty || undefined,
      // Attribution data - preserves source material author for NFT & Story Protocol
      ownerWallet: (prismaGame as { ownerWallet?: string | null }).ownerWallet || undefined,
      ownershipSource: (prismaGame as { ownershipSource?: Game['ownershipSource'] | null }).ownershipSource || undefined,
      creatorWallet: prismaGame.creatorWallet || undefined,
      authorWallet: prismaGame.authorWallet || undefined,
      authorParagraphUsername: prismaGame.authorParagraphUsername || undefined,
      publicationName: prismaGame.publicationName || undefined,
      publicationSummary: prismaGame.publicationSummary || undefined,
      subscriberCount: prismaGame.subscriberCount || undefined,
      articlePublishedAt: prismaGame.articlePublishedAt || undefined,
      nftTokenId: prismaGame.nftTokenId || undefined,
      nftTransactionHash: prismaGame.nftTransactionHash || undefined,
      nftMintedAt: prismaGame.nftMintedAt || undefined,
      nftContractAddress: (prismaGame as { nftContractAddress?: string }).nftContractAddress || undefined,
      nftChainId: (prismaGame as { nftChainId?: number }).nftChainId || undefined,
      nftMetadataUri: gameWithArtifacts.nftMetadataUri || undefined,
      gameMetadataUri: gameWithArtifacts.gameMetadataUri || undefined,
      savedPanels,
      artifactManifestUri: gameWithArtifacts.artifactManifestUri || undefined,
      artifactSavedAt: gameWithArtifacts.artifactSavedAt || undefined,
      storyIpId: (prismaGame as { storyIpId?: string }).storyIpId || undefined,
      storyRegistrationTxHash: (prismaGame as { storyRegistrationTxHash?: string }).storyRegistrationTxHash || undefined,
      storyRegisteredAt: (prismaGame as { storyRegisteredAt?: Date }).storyRegisteredAt || undefined,
      cdrReadConditionType: (prismaGame as { cdrReadConditionType?: string }).cdrReadConditionType || undefined,
      cdrVaultedAt: (prismaGame as { cdrVaultedAt?: Date }).cdrVaultedAt || undefined,
      wordleAnswerVaultUuid: prismaGame.wordleAnswerVaultUuid || undefined,
      promptVaultUuid: (prismaGame as { promptVaultUuid?: string }).promptVaultUuid || undefined,
      private: prismaGame.private,
      userId: prismaGame.userId || undefined,
      paymentId: (prismaGame as { paymentId?: string | null }).paymentId || undefined,
      // Cast to any because Prisma types are not yet updated in the running process
      playFee: (prismaGame as { playFee?: string }).playFee || undefined,
      featured: (prismaGame as { featured?: boolean }).featured || false,
      createdAt: prismaGame.createdAt,
      updatedAt: prismaGame.updatedAt,
    }
  }

  private static mapArtifactPanels(panels: GameArtifactPanelSnapshot[]): SavedGamePanel[] {
    return [...panels]
      .sort((a, b) => a.panelIndex - b.panelIndex)
      .map(panel => ({
        id: panel.id,
        panelNumber: panel.panelIndex + 1,
        narrativeText: panel.narrativeText,
        imageUrl: panel.imageUrl || undefined,
        imageModel: panel.imageModel || undefined,
        userChoice: panel.userChoice || undefined,
        audioUrl: panel.audioUrl || undefined,
        createdAt: panel.createdAt,
      }))
  }

  private static extractSavedPanelsFromChats(chats: GameChatSnapshot[]): SavedGamePanel[] {
    if (!chats.length) return []

    const sessions = chats.reduce((groups, chat) => {
      const sessionChats = groups.get(chat.sessionId) || []
      sessionChats.push(chat)
      groups.set(chat.sessionId, sessionChats)
      return groups
    }, new Map<string, GameChatSnapshot[]>())

    const bestSession = Array.from(sessions.values())
      .map(sessionChats => {
        const sortedChats = [...sessionChats].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        const assistantChats = sortedChats.filter(chat => chat.role === 'assistant')
        const lastAssistantAt = assistantChats.at(-1)?.createdAt.getTime() || 0

        return {
          chats: sortedChats,
          assistantCount: assistantChats.length,
          lastAssistantAt,
        }
      })
      .filter(session => session.assistantCount > 0)
      .sort((a, b) => {
        if (b.assistantCount !== a.assistantCount) return b.assistantCount - a.assistantCount
        return b.lastAssistantAt - a.lastAssistantAt
      })[0]

    if (!bestSession) return []

    const assistantChats = bestSession.chats.filter(chat => chat.role === 'assistant')

    return assistantChats.slice(0, 5).map((assistantChat, index) => {
      const nextAssistantChat = assistantChats[index + 1]
      const assistantCreatedAt = assistantChat.createdAt.getTime()
      const nextAssistantCreatedAt = nextAssistantChat?.createdAt.getTime()
      const userChoice = bestSession.chats.find(chat => {
        const chatCreatedAt = chat.createdAt.getTime()
        return (
          chat.role === 'user' &&
          chatCreatedAt > assistantCreatedAt &&
          (!nextAssistantCreatedAt || chatCreatedAt < nextAssistantCreatedAt)
        )
      })?.content

      return {
        id: assistantChat.id,
        panelNumber: index + 1,
        narrativeText: assistantChat.content,
        imageModel: assistantChat.model,
        userChoice,
        createdAt: assistantChat.createdAt,
      }
    })
  }

  // ============================================================================
  // Asset Management (Workshop / Marketplace)
  // Reuses existing 'Asset' model with type='pack' for consolidation
  // ============================================================================

  /**
   * Save an asset pack (from Workshop)
   */
  static async saveAssetPack(data: {
    title: string
    description: string
    content: import('../types').AssetGenerationResponse
    creatorId?: string
    articleUrl?: string
    genre?: string
  }) {
    try {
      const asset = await prisma.asset.create({
        data: {
          title: data.title,
          description: data.description,
          type: 'pack', // Consolidating: Pack is just a type of Asset
          content: JSON.stringify(data.content),
          genre: data.genre || 'General',
          articleUrl: data.articleUrl,
          creatorId: data.creatorId,
        }
      })
      return asset
    } catch (error) {
      console.error('Failed to save asset pack:', error)
      throw new Error('Failed to save asset pack')
    }
  }

  /**
   * Get asset packs
   */
  static async getAssetPacks(options: {
    limit?: number
    offset?: number
    creatorId?: string
    search?: string
  } = {}) {
    const { limit = 20, offset = 0, creatorId, search } = options

    try {
      const where: Prisma.AssetWhereInput = {
        type: 'pack',
        ...(creatorId ? { creatorId } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        } : {})
      }

      const [packs, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.asset.count({ where })
      ])

      return {
        packs: packs.map(p => ({
          ...p,
          content: JSON.parse(p.content) // Hydrate JSON
        })),
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    } catch (error) {
      console.error('Failed to get asset packs:', error)
      return { packs: [], total: 0, hasMore: false }
    }
  }

  /**
   * Get single asset pack
   */
  static async getAssetPack(id: string) {
    try {
      const asset = await prisma.asset.findUnique({ where: { id } })
      if (!asset) return null

      return {
        ...asset,
        content: JSON.parse(asset.content)
      }
    } catch (error) {
      console.error('Failed to get asset pack:', error)
      return null
    }
  }

  /**
   * Get marketplace assets (individual components)
   */
  static async getMarketplaceAssets(options: {
    limit?: number
    offset?: number
    type?: string
    genre?: string
    search?: string
  } = {}) {
    const { limit = 20, offset = 0, type, genre, search } = options

    try {
      const where: Prisma.AssetWhereInput = {
        // Filter out packs, only show individual components
        type: type ? { equals: type } : { not: 'pack' },
        ...(genre ? { genre: { equals: genre, mode: 'insensitive' } } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        } : {})
      }

      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.asset.count({ where })
      ])

      return {
        assets: assets.map(a => ({
          ...a,
          // Try to parse content if it's JSON, otherwise keep as string
          content: this.safeJsonParse(a.content)
        })),
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    } catch (error) {
      console.error('Failed to get marketplace assets:', error)
      return { assets: [], total: 0, hasMore: false }
    }
  }

  /**
   * Extract reusable assets from a minted game and persist them.
   * Creates one Asset record per extracted component (character, plot, world)
   * derived from the game's title, description, genre, and article context.
   * Returns the saved asset IDs for downstream Story Protocol wiring.
   */
  static async extractAndSaveGameAssets(gameId: string): Promise<string[]> {
    try {
      const game = await prisma.game.findUnique({ where: { id: gameId } })
      if (!game) return []

      const components: { type: string; title: string; description: string }[] = [
        {
          type: 'plot',
          title: `${game.title} — Plot`,
          description: game.description || game.tagline,
        },
        {
          type: 'world',
          title: `${game.title} — World`,
          description: game.tagline || game.description,
        },
      ]

      // Add a character asset if we have article context to draw from
      if (game.articleContext) {
        components.push({
          type: 'character',
          title: `${game.title} — Character`,
          description: game.articleContext.slice(0, 500),
        })
      }

      const savedIds: string[] = []
      for (const component of components) {
        const asset = await prisma.asset.create({
          data: {
            title: component.title,
            description: component.description,
            type: component.type,
            content: JSON.stringify({ source: 'game-mint', gameId, ...component }),
            genre: game.genre,
            articleUrl: game.articleUrl || null,
            creatorId: game.userId || null,
          },
        })
        savedIds.push(asset.id)
      }

      return savedIds
    } catch (error) {
      console.error('Failed to extract game assets:', error)
      return []
    }
  }

  private static safeJsonParse(text: string) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
}
