/**
 * IPFS Metadata Service
 * Single source of truth for NFT metadata creation and IPFS uploads
 * Integrates with Pinata for reliable pinning
 */

import { ComicBookFinalePanelData } from '@/domains/games/components/comic-book-finale'

export interface GameCreator {
  walletAddress: string
  displayName: string // ENS, Farcaster @username, or shortened wallet
  avatar?: string // Farcaster PFP or generated avatar
  farcasterUsername?: string
}

export interface GameAuthor {
  paragraphUsername: string // e.g. "fredwilson" 
  displayName?: string // e.g. "Fred Wilson"
  walletAddress?: string // Author's wallet if available
  profileUrl: string // e.g. "https://paragraph.xyz/@fredwilson"
}

export interface NFTMetadata {
  // Standard NFT metadata (ERC-721)
  name: string
  description: string
  image: string // IPFS URI to cover image
  external_url: string // Link back to WritArcade game
  
  // WritArcade-specific attributes
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  
  // Game content
  animation_url?: string // IPFS URI to interactive game data
  panels: ComicBookFinalePanelData[]
  
  // Attribution
  creator: GameCreator
  author: GameAuthor
  
  // Provenance
  articleUrl: string
  createdAt: string // ISO timestamp
  totalPanels: number
  gameVersion: string // "1.0"
}

export interface GameMetadata {
  // Full game data for Story Protocol
  title: string
  description: string
  genre: string
  difficulty: string
  panels: ComicBookFinalePanelData[]
  creator: GameCreator
  author: GameAuthor
  articleUrl: string
  createdAt: string
  choices: Array<{
    panelIndex: number
    choice: string
    timestamp: string
  }>
}

export class IPFSMetadataService {
  private static instance: IPFSMetadataService
  private readonly pinataApiKey: string
  private readonly pinataSecretKey: string
  private readonly pinataGateway: string

  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || ''
    this.pinataSecretKey = process.env.PINATA_SECRET_API_KEY || ''
    this.pinataGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud'
    
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      console.warn('IPFS service initialized without Pinata credentials')
    }
  }

  public static getInstance(): IPFSMetadataService {
    if (!IPFSMetadataService.instance) {
      IPFSMetadataService.instance = new IPFSMetadataService()
    }
    return IPFSMetadataService.instance
  }

  /**
   * Create NFT metadata with proper attribution
   */
  public createNFTMetadata(
    gameData: {
      title: string
      description: string
      genre: string
      difficulty: string
      panels: ComicBookFinalePanelData[]
      articleUrl: string
    },
    creator: GameCreator,
    author: GameAuthor
  ): NFTMetadata {
    const totalPanels = gameData.panels.length
    const createdAt = new Date().toISOString()

    return {
      name: gameData.title,
      description: `${gameData.description}\n\nCreated by ${creator.displayName} • Inspired by ${author.displayName} • ${totalPanels} interactive panels`,
      image: gameData.panels[0]?.imageUrl || '', // Cover image (first panel)
      external_url: `${process.env.NEXT_PUBLIC_BASE_URL}/games/${this.slugify(gameData.title)}`,
      
      attributes: [
        { trait_type: 'Genre', value: gameData.genre },
        { trait_type: 'Difficulty', value: gameData.difficulty },
        { trait_type: 'Panels', value: totalPanels },
        { trait_type: 'Creator', value: creator.displayName },
        { trait_type: 'Author', value: author.displayName || author.paragraphUsername || 'Unknown Author' },
        { trait_type: 'Source', value: 'Paragraph' },
        { trait_type: 'Platform', value: 'WritArcade' },
        { trait_type: 'Version', value: '1.0' }
      ],
      
      panels: gameData.panels,
      creator,
      author,
      articleUrl: gameData.articleUrl,
      createdAt,
      totalPanels,
      gameVersion: '1.0'
    }
  }

  /**
   * Create comprehensive game metadata for Story Protocol
   */
  public createGameMetadata(
    nftMetadata: NFTMetadata,
    userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
  ): GameMetadata {
    return {
      title: nftMetadata.name,
      description: nftMetadata.description,
      genre: nftMetadata.attributes.find(a => a.trait_type === 'Genre')?.value as string || '',
      difficulty: nftMetadata.attributes.find(a => a.trait_type === 'Difficulty')?.value as string || '',
      panels: nftMetadata.panels,
      creator: nftMetadata.creator,
      author: nftMetadata.author,
      articleUrl: nftMetadata.articleUrl,
      createdAt: nftMetadata.createdAt,
      choices: userChoices
    }
  }

  /**
   * Upload JSON metadata to IPFS via Pinata
   */
  public async uploadToIPFS(data: any, filename: string): Promise<string> {
    try {
      if (!this.pinataApiKey || !this.pinataSecretKey) {
        throw new Error('Pinata credentials not configured')
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: JSON.stringify({
          pinataContent: data,
          pinataMetadata: {
            name: filename,
            keyvalues: {
              platform: 'WritArcade',
              type: filename.includes('nft') ? 'nft-metadata' : 'game-metadata',
              timestamp: new Date().toISOString()
            }
          },
          pinataOptions: {
            cidVersion: 1
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.status}`)
      }

      const result = await response.json()
      return `ipfs://${result.IpfsHash}`
      
    } catch (error) {
      console.error('IPFS upload error:', error)
      
      // Fallback to local storage or throw
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload complete game package (NFT + Game metadata)
   */
  public async uploadGamePackage(
    gameData: {
      title: string
      description: string
      genre: string
      difficulty: string
      panels: ComicBookFinalePanelData[]
      articleUrl: string
    },
    creator: GameCreator,
    author: GameAuthor,
    userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
  ): Promise<{ nftMetadataUri: string; gameMetadataUri: string }> {
    
    // 1. Create metadata objects
    const nftMetadata = this.createNFTMetadata(gameData, creator, author)
    const gameMetadata = this.createGameMetadata(nftMetadata, userChoices)
    
    // 2. Upload both to IPFS
    const [nftMetadataUri, gameMetadataUri] = await Promise.all([
      this.uploadToIPFS(nftMetadata, `${this.slugify(gameData.title)}-nft-metadata.json`),
      this.uploadToIPFS(gameMetadata, `${this.slugify(gameData.title)}-game-metadata.json`)
    ])
    
    return {
      nftMetadataUri,
      gameMetadataUri
    }
  }

  /**
   * Convert title to URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }
}

// Export singleton instance
export const ipfsMetadataService = IPFSMetadataService.getInstance()