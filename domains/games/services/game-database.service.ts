import { prisma } from '@/lib/database'
import { createSlug } from '@/lib/utils'
import type { Game, GameGenerationResponse } from '../types'
import { Prisma } from '@prisma/client'

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
    userId?: string
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
      
      const game = await prisma.game.create({
        data: {
          title: gameData.title,
          slug,
          description: gameData.description,
          tagline: gameData.tagline,
          genre: gameData.genre,
          subgenre: gameData.subgenre,
          primaryColor: gameData.primaryColor,
          promptName: gameData.promptName,
          promptText: gameData.promptText,
          promptModel: gameData.promptModel,
          private: false, // Default to public for now
          userId: userId || null,
        }
      })
      
      return this.mapPrismaGameToGame(game)
      
    } catch (error) {
      console.error('Failed to create game:', error)
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
              username: true,
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
    includePrivate?: boolean
  } = {}) {
    const {
      limit = 25,
      offset = 0,
      search,
      genre,
      userId,
      includePrivate = false
    } = options
    
    try {
      // Build where clause
      const where: Prisma.GameWhereInput = {
        AND: [
          // Privacy filter
          includePrivate ? {} : { private: false },
          // User filter
          userId ? { userId } : {},
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
        ]
      }
      
      const [games, total] = await Promise.all([
        prisma.game.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                username: true,
              }
            }
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
      throw new Error('Failed to fetch games')
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
    updates: Partial<Pick<Game, 'title' | 'description' | 'tagline' | 'private'>>
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
  private static mapPrismaGameToGame(prismaGame: any): Game {
    return {
      id: prismaGame.id,
      title: prismaGame.title,
      slug: prismaGame.slug,
      description: prismaGame.description,
      tagline: prismaGame.tagline,
      genre: prismaGame.genre,
      subgenre: prismaGame.subgenre,
      primaryColor: prismaGame.primaryColor,
      promptName: prismaGame.promptName,
      promptText: prismaGame.promptText,
      promptModel: prismaGame.promptModel,
      imagePromptModel: prismaGame.imagePromptModel,
      imagePromptName: prismaGame.imagePromptName,
      imagePromptText: prismaGame.imagePromptText,
      imageData: prismaGame.imageData,
      musicPromptText: prismaGame.musicPromptText,
      musicPromptSeedImage: prismaGame.musicPromptSeedImage,
      private: prismaGame.private,
      userId: prismaGame.userId,
      createdAt: prismaGame.createdAt,
      updatedAt: prismaGame.updatedAt,
    }
  }
}