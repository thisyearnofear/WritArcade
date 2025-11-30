import { prisma } from '@/lib/database'
import { Prisma } from '@prisma/client'

export interface AssetData {
  title: string
  description: string
  type: 'character' | 'mechanic' | 'plot' | 'world' | 'dialog'
  content: string
  genre: string
  tags: string[]
  articleUrl?: string
  creatorId?: string
}

export interface Asset extends AssetData {
  id: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Asset Database Service
 * Handles CRUD operations for game assets (reusable components)
 */
export class AssetDatabaseService {
  
  /**
   * Create a new asset
   */
  static async createAsset(assetData: AssetData): Promise<Asset> {
    try {
      const asset = await prisma.asset.create({
        data: {
          title: assetData.title,
          description: assetData.description,
          type: assetData.type,
          content: assetData.content,
          genre: assetData.genre,
          tags: assetData.tags,
          articleUrl: assetData.articleUrl,
          creatorId: assetData.creatorId,
        }
      })
      
      return this.mapPrismaAssetToAsset(asset)
    } catch (error) {
      console.error('Failed to create asset:', error)
      throw new Error('Failed to save asset to database')
    }
  }
  
  /**
   * Get asset by ID
   */
  static async getAssetById(id: string): Promise<Asset | null> {
    try {
      const asset = await prisma.asset.findUnique({
        where: { id },
      })
      
      return asset ? this.mapPrismaAssetToAsset(asset) : null
    } catch (error) {
      console.error('Failed to get asset by ID:', error)
      return null
    }
  }
  
  /**
   * Get assets with pagination and filtering
   */
  static async getAssets(options: {
    limit?: number
    offset?: number
    type?: string
    genre?: string
    creatorId?: string
    tags?: string[]
    search?: string
  } = {}) {
    const {
      limit = 25,
      offset = 0,
      type,
      genre,
      creatorId,
      tags = [],
      search,
    } = options
    
    try {
      const where: Prisma.AssetWhereInput = {
        AND: [
          type ? { type } : {},
          genre ? { genre } : {},
          creatorId ? { creatorId } : {},
          tags.length > 0 ? { tags: { hasSome: tags } } : {},
          search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ]
          } : {},
        ]
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
        assets: assets.map(this.mapPrismaAssetToAsset),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      }
    } catch (error) {
      console.error('Failed to get assets:', error)
      return {
        assets: [],
        total: 0,
        limit,
        offset,
        hasMore: false,
      }
    }
  }
  
  /**
   * Get assets by type
   */
  static async getAssetsByType(type: string, limit: number = 25) {
    return this.getAssets({ type, limit })
  }
  
  /**
   * Get assets by genre
   */
  static async getAssetsByGenre(genre: string, limit: number = 25) {
    return this.getAssets({ genre, limit })
  }
  
  /**
   * Get creator's assets
   */
  static async getCreatorAssets(creatorId: string, limit: number = 25) {
    return this.getAssets({ creatorId, limit })
  }
  
  /**
   * Search assets by tags
   */
  static async getAssetsByTags(tags: string[], limit: number = 25) {
    return this.getAssets({ tags, limit })
  }
  
  /**
   * Update asset
   */
  static async updateAsset(
    id: string,
    updates: Partial<Pick<AssetData, 'title' | 'description' | 'tags' | 'content'>>
  ): Promise<Asset | null> {
    try {
      const asset = await prisma.asset.update({
        where: { id },
        data: updates,
      })
      
      return this.mapPrismaAssetToAsset(asset)
    } catch (error) {
      console.error('Failed to update asset:', error)
      return null
    }
  }
  
  /**
   * Delete asset
   */
  static async deleteAsset(id: string): Promise<boolean> {
    try {
      await prisma.asset.delete({
        where: { id }
      })
      
      return true
    } catch (error) {
      console.error('Failed to delete asset:', error)
      return false
    }
  }
  
  /**
   * Get asset statistics
   */
  static async getAssetStats() {
    try {
      const [
        totalAssets,
        assetsByType,
        assetsByGenre,
        topTags,
      ] = await Promise.all([
        prisma.asset.count(),
        prisma.asset.groupBy({
          by: ['type'],
          _count: { type: true },
        }),
        prisma.asset.groupBy({
          by: ['genre'],
          _count: { genre: true },
          orderBy: { _count: { genre: 'desc' } },
          take: 10,
        }),
        // Get most common tags
        prisma.$queryRaw<Array<{ tag: string; count: number }>>`
          SELECT unnest(tags) as tag, COUNT(*) as count
          FROM "Asset"
          GROUP BY tag
          ORDER BY count DESC
          LIMIT 10
        `
      ])
      
      return {
        totalAssets,
        assetsByType: assetsByType.map(a => ({ type: a.type, count: a._count.type })),
        assetsByGenre: assetsByGenre.map(a => ({ genre: a.genre, count: a._count.genre })),
        topTags,
      }
    } catch (error) {
      console.error('Failed to get asset stats:', error)
      return {
        totalAssets: 0,
        assetsByType: [],
        assetsByGenre: [],
        topTags: [],
      }
    }
  }
  
  /**
   * Map Prisma asset model to our Asset type
   */
  private static mapPrismaAssetToAsset(prismaAsset: any): Asset {
    return {
      id: prismaAsset.id,
      title: prismaAsset.title,
      description: prismaAsset.description,
      type: prismaAsset.type,
      content: prismaAsset.content,
      genre: prismaAsset.genre,
      tags: prismaAsset.tags || [],
      articleUrl: prismaAsset.articleUrl,
      creatorId: prismaAsset.creatorId,
      createdAt: prismaAsset.createdAt,
      updatedAt: prismaAsset.updatedAt,
    }
  }
}
