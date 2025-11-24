/**
 * Farcaster Profile Utilities
 * 
 * Fetches social profile data (username, avatar, bio) from Farcaster
 * based on wallet address. No database caching - always fresh from Farcaster.
 */

export interface FarcasterProfile {
    fid?: number
    username?: string
    displayName?: string
    bio?: string
    pfpUrl?: string
    verifiedAddresses?: string[]
}

/**
 * Get Farcaster profile for a wallet address
 * TODO: Implement using Neynar API or Farcaster Hub
 */
export async function getFarcasterProfile(
    walletAddress: string
): Promise<FarcasterProfile | null> {
    try {
        // TODO: Implement Farcaster API call
        // For now, return null (will show wallet address as fallback)

        // Example implementation with Neynar:
        // const response = await fetch(
        //   `https://api.neynar.com/v2/farcaster/user/by-verification?address=${walletAddress}`,
        //   {
        //     headers: {
        //       'api_key': process.env.NEYNAR_API_KEY!,
        //     },
        //   }
        // )
        // const data = await response.json()
        // return {
        //   fid: data.user.fid,
        //   username: data.user.username,
        //   displayName: data.user.display_name,
        //   bio: data.user.profile.bio.text,
        //   pfpUrl: data.user.pfp_url,
        //   verifiedAddresses: data.user.verified_addresses.eth_addresses,
        // }

        return null
    } catch (error) {
        console.error('Failed to fetch Farcaster profile:', error)
        return null
    }
}

/**
 * Get display name for a user (Farcaster username or wallet address)
 */
export async function getDisplayName(walletAddress: string): Promise<string> {
    const profile = await getFarcasterProfile(walletAddress)

    if (profile?.username) {
        return `@${profile.username}`
    }

    if (profile?.displayName) {
        return profile.displayName
    }

    // Fallback to shortened wallet address
    return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
}

/**
 * Get avatar URL for a user (Farcaster PFP or default)
 */
export async function getAvatarUrl(walletAddress: string): Promise<string> {
    const profile = await getFarcasterProfile(walletAddress)

    if (profile?.pfpUrl) {
        return profile.pfpUrl
    }

    // Fallback to generated avatar (e.g., from wallet address)
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`
}
