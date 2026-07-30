/**
 * User Identity Service
 * Enhances existing user data with rich identity information
 * Consolidates ENS, Farcaster, and wallet address resolution
 */

import { getFarcasterProfile } from '@/domains/farcaster/services/farcaster'
import { GameCreator, GameAuthor } from './ipfs-metadata.service'

interface ENSProfile {
  name: string
  avatar?: string
}

export class UserIdentityService {
  private static instance: UserIdentityService
  private readonly ensCache = new Map<string, ENSProfile>()
  private readonly farcasterCache = new Map<string, { username: string; displayName: string; pfpUrl?: string }>()

  public static getInstance(): UserIdentityService {
    if (!UserIdentityService.instance) {
      UserIdentityService.instance = new UserIdentityService()
    }
    return UserIdentityService.instance
  }

  /**
   * Get rich user identity for game creator
   */
  public async getGameCreator(walletAddress: string): Promise<GameCreator> {
    try {
      // Try Farcaster first (most common for Web3 users)
      const farcasterProfile = await getFarcasterProfile(walletAddress)
      
      if (farcasterProfile?.username) {
        return {
          walletAddress,
          displayName: `@${farcasterProfile.username}`,
          avatar: farcasterProfile.pfpUrl,
          farcasterUsername: farcasterProfile.username
        }
      }

      // Try ENS next
      const ensName = await this.resolveENS(walletAddress)
      if (ensName) {
        return {
          walletAddress,
          displayName: ensName,
          avatar: await this.getENSAvatar(ensName)
        }
      }

      // Fallback to shortened wallet
      return {
        walletAddress,
        displayName: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`
      }

    } catch (error) {
      console.error('Error resolving user identity:', error)
      
      // Safe fallback
      return {
        walletAddress,
        displayName: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`
      }
    }
  }

  /**
   * Get rich author identity from Paragraph data
   */
  public async getGameAuthor(
    paragraphUsername: string, 
    authorWallet?: string
  ): Promise<GameAuthor> {
    
    const baseAuthor: GameAuthor = {
      paragraphUsername,
      displayName: this.formatParagraphUsername(paragraphUsername),
      profileUrl: `https://paragraph.xyz/@${paragraphUsername}`,
      walletAddress: authorWallet
    }

    // If we have author wallet, try to enhance with their social profiles
    if (authorWallet) {
      try {
        const farcasterProfile = await getFarcasterProfile(authorWallet)
        if (farcasterProfile?.displayName) {
          baseAuthor.displayName = farcasterProfile.displayName
        }
      } catch {
        // Keep the formatted username as fallback
      }
    }

    return baseAuthor
  }

  /**
   * Resolve ENS name for wallet address
   */
  private async resolveENS(walletAddress: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.ensCache.get(walletAddress)
      if (cached) {
        return cached.name
      }

      // Use a public ENS resolver
      const response = await fetch(
        `https://api.ensdata.net/${walletAddress}`,
        { headers: { 'Accept': 'application/json' } }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      
      if (data.ens) {
        this.ensCache.set(walletAddress, { name: data.ens, avatar: data.avatar })
        return data.ens
      }

      return null
      
    } catch (error) {
      console.error('ENS resolution error:', error)
      return null
    }
  }

  /**
   * Get ENS avatar
   */
  private async getENSAvatar(ensName: string): Promise<string | undefined> {
    try {
      const cached = Array.from(this.ensCache.values()).find(entry => entry.name === ensName)
      return cached?.avatar
    } catch {
      return undefined
    }
  }

  /**
   * Format Paragraph username for display
   */
  private formatParagraphUsername(username: string): string {
    // Convert "fredwilson" to "Fred Wilson" style display name
    return username
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Handle camelCase
      .split(/[-_]/) // Handle kebab-case or snake_case
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Get user identity for display in UI components
   */
  public async getUserDisplayData(walletAddress: string): Promise<{
    displayName: string
    avatar: string
    shortAddress: string
    farcasterUsername?: string
  }> {
    const creator = await this.getGameCreator(walletAddress)
    
    return {
      displayName: creator.displayName,
      avatar: creator.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
      shortAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      farcasterUsername: creator.farcasterUsername
    }
  }
}

// Export singleton instance
export const userIdentityService = UserIdentityService.getInstance()