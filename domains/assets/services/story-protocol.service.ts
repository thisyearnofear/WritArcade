import { getStoryNetwork, WRITARCADE_STORY_CONFIG } from '@/lib/story-config'
import type { Asset } from './asset-database.service'

/**
 * Story Protocol Asset Registration
 * 
 * Registers reusable game assets as IP on Story Protocol
 * Enables IP derivative tracking and automated royalty distribution
 */

export interface StoryAssetMetadata {
  title: string
  description: string
  type: 'character' | 'mechanic' | 'plot' | 'world' | 'dialog'
  genre: string
  tags: string[]
  articleUrl?: string
  creatorWallet: string
  createdAt: string
}

export interface StoryIPAssetResponse {
  ipId: string // IP Asset ID on Story Protocol
  transactionHash: string
  blockNumber: number
  registeredAt: string
  metadataUri: string
}

export interface StoryLicenseTerms {
  commercialUse: boolean
  commercialAttribution: boolean
  derivatives: 'allowed' | 'yes-but-different-license' | 'no'
  derivativeRoyalty: number // percentage
}

export interface StoryDerivativeResponse {
  derivativeId: string // IP ID for derivative (game)
  parentIpId: string
  licenseAgreed: boolean
  royaltyBasis: number // basis points (10000 = 100%)
  createdAt: string
}

/**
 * Story Protocol Asset Service
 * Minimal implementation: 4 core methods only
 */
export class StoryProtocolAssetService {
  private static readonly NETWORK = getStoryNetwork()
  private static readonly ENABLED = WRITARCADE_STORY_CONFIG.enabled

  /**
   * Register a game asset as IP on Story Protocol
   * 
   * Creates a persistent IP record that can be referenced by derivative games
   * Stores metadata on IPFS, registers reference on Story blockchain
   */
  static async registerAssetAsIP(
    asset: Asset,
    creatorWallet: string
  ): Promise<StoryIPAssetResponse> {
    if (!this.ENABLED) {
      return this.mockResponse('registerAsset', asset.id)
    }

    try {
      // Build metadata
      const metadata: StoryAssetMetadata = {
        title: asset.title,
        description: asset.description,
        type: asset.type as any,
        genre: asset.genre,
        tags: asset.tags || [],
        articleUrl: asset.articleUrl,
        creatorWallet,
        createdAt: new Date().toISOString(),
      }

      // TODO: Upload metadata to IPFS
      // const ipfsHash = await uploadToIPFS(metadata)

      // TODO: Call Story Protocol IPAssetRegistry.registerNonFungibleIP
      // const result = await storyClient.IPAssetRegistry.registerNonFungibleIP({
      //   nftAddress: asset.id,
      //   metadata: ipfsHash,
      // })

      // Mock response for now
      return {
        ipId: `story-ip-${asset.id.slice(0, 8)}`,
        transactionHash: `0x${'a'.repeat(64)}`,
        blockNumber: 12345678,
        registeredAt: new Date().toISOString(),
        metadataUri: `ipfs://QmXxxx...${asset.id.slice(0, 8)}`,
      }
    } catch (error) {
      console.error('Failed to register asset as IP:', error)
      throw new Error('Story Protocol registration failed')
    }
  }

  /**
   * Attach license terms to an IP asset
   * 
   * Defines how derivative works (games) can use this asset
   * Sets royalty expectations and usage permissions
   */
  static async attachLicenseTerms(
    ipId: string,
    terms: StoryLicenseTerms
  ): Promise<boolean> {
    if (!this.ENABLED) {
      return true
    }

    try {
      // TODO: Call Story Protocol LicenseRegistry.grantLicense
      // const result = await storyClient.LicenseRegistry.grantLicense({
      //   ipId,
      //   licenseTerms: {
      //     commercialUse: terms.commercialUse,
      //     commercialAttribution: terms.commercialAttribution,
      //     derivatives: terms.derivatives,
      //     derivativeRoyalty: terms.derivativeRoyalty,
      //   },
      // })

      console.log(`License terms attached to IP ${ipId}:`, terms)
      return true
    } catch (error) {
      console.error('Failed to attach license terms:', error)
      throw new Error('License attachment failed')
    }
  }

  /**
   * Register a derivative game that uses one or more assets
   * 
   * Creates a record on Story Protocol linking the game back to parent assets
   * Establishes royalty obligation chain for automated payment distribution
   */
  static async registerGameAsDerivative(
    gameId: string,
    gameTitle: string,
    parentAssetIds: string[]
  ): Promise<StoryDerivativeResponse> {
    if (!this.ENABLED) {
      return this.mockDerivativeResponse(gameId, parentAssetIds[0])
    }

    try {
      // TODO: For each parent asset, register game as derivative
      // const results = await Promise.all(
      //   parentAssetIds.map((parentIpId) =>
      //     storyClient.IPAssetRegistry.registerDerivative({
      //       parentIpId,
      //       childNftAddress: gameId,
      //       childMetadata: { title: gameTitle, derivedFrom: [parentIpId] },
      //     })
      //   )
      // )

      // Return first parent (in real implementation, aggregate all)
      return {
        derivativeId: `story-derivative-${gameId.slice(0, 8)}`,
        parentIpId: `story-ip-${parentAssetIds[0].slice(0, 8)}`,
        licenseAgreed: true,
        royaltyBasis: 1000, // 10% royalty to asset creator
        createdAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Failed to register derivative game:', error)
      throw new Error('Derivative registration failed')
    }
  }

  /**
   * Get Story IP asset details
   * 
   * Retrieves registration status, metadata, and royalty configuration
   * Used to verify IP is properly registered before accepting derivatives
   */
  static async getIPAssetDetails(ipId: string): Promise<{
    ipId: string
    title: string
    description: string
    royaltyRate: number
    licenseTerms: StoryLicenseTerms | null
    derivativeCount: number
    totalRoyaltiesCollected: string
  } | null> {
    if (!this.ENABLED) {
      return {
        ipId,
        title: 'Asset Title',
        description: 'Asset Description',
        royaltyRate: 10,
        licenseTerms: null,
        derivativeCount: 0,
        totalRoyaltiesCollected: '0',
      }
    }

    try {
      // TODO: Call Story Protocol to fetch IP details
      // const ipAsset = await storyClient.IPAssetRegistry.getIPAsset(ipId)
      // const licenseTerms = await storyClient.LicenseRegistry.getLicenseTerms(ipId)

      return null // IP not found
    } catch (error) {
      console.error('Failed to get IP asset details:', error)
      return null
    }
  }

  /**
   * Mock response for testing (when Story Protocol is disabled)
   */
  private static mockResponse(method: string, assetId: string): StoryIPAssetResponse {
    return {
      ipId: `story-ip-${assetId.slice(0, 8)}`,
      transactionHash: `0x${'b'.repeat(64)}`,
      blockNumber: 12345678,
      registeredAt: new Date().toISOString(),
      metadataUri: `ipfs://QmXxxx...${assetId.slice(0, 8)}`,
    }
  }

  /**
   * Mock derivative response for testing
   */
  private static mockDerivativeResponse(
    gameId: string,
    parentAssetId: string
  ): StoryDerivativeResponse {
    return {
      derivativeId: `story-derivative-${gameId.slice(0, 8)}`,
      parentIpId: `story-ip-${parentAssetId.slice(0, 8)}`,
      licenseAgreed: true,
      royaltyBasis: 1000,
      createdAt: new Date().toISOString(),
    }
  }

  /**
   * Check if Story Protocol integration is enabled
   */
  static isEnabled(): boolean {
    return this.ENABLED
  }

  /**
   * Get the Story network being used
   */
  static getNetwork() {
    return this.NETWORK
  }
}
