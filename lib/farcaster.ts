/**
 * Farcaster Integration Utilities
 * 
 * Provides functions to interact with Farcaster Mini Apps for:
 * - User profile data (username, avatar, bio)
 * - Mini App SDK integration for actions and context
 * - Social features (sharing, wallet)
 */

import { sdk } from '@farcaster/miniapp-sdk'

export interface FarcasterProfile {
    fid?: number
    username?: string
    displayName?: string
    bio?: string
    pfpUrl?: string
    verifiedAddresses?: string[]
}

/**
 * Get Farcaster context for current user
 * Returns user info, client data, etc.
 */
export async function getFarcasterContext(): Promise<any> {
    try {
        const context = await sdk.context
        console.log('Farcaster context loaded:', context)
        return context
    } catch (error) {
        console.error('Failed to load Farcaster context:', error)
        return null
    }
}

/**
 * Signal that the Mini App is ready to display
 * Call this after your UI has loaded to hide the splash screen
 */
export async function readyMiniApp(): Promise<void> {
    try {
        await sdk.actions.ready()
    } catch (error) {
        console.error('Failed to signal ready:', error)
    }
}

/**
 * Check if app is running in Farcaster context
 */
export function isInFarcasterContext(): boolean {
    try {
        return sdk.context !== null
    } catch {
        return false
    }
}

/**
 * Get Farcaster profile for a wallet address
 * Uses Neynar API (free tier supports bulk lookups)
 */
export async function getFarcasterProfile(
    walletAddress: string
): Promise<FarcasterProfile | null> {
    try {
        const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || process.env.NEYNAR_API_KEY

        if (!apiKey) {
            console.warn('NEYNAR_API_KEY not configured, skipping Farcaster profile fetch')
            return null
        }

        const response = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${walletAddress}`,
            {
                headers: {
                    'api_key': apiKey,
                },
            }
        )

        if (!response.ok) {
            console.error('Neynar API error:', response.status)
            return null
        }

        const data = await response.json()

        if (!data || Object.keys(data).length === 0) {
            return null
        }

        // Get first user from response
        const users = Object.values(data) as any[]
        const user = users[0]?.[0]

        if (!user) return null

        return {
            fid: user.fid,
            username: user.username,
            displayName: user.display_name || user.username,
            bio: user.profile?.bio?.text,
            pfpUrl: user.pfp_url,
            verifiedAddresses: user.verified_addresses?.eth_addresses || [],
        }
    } catch (error) {
        console.error('Failed to fetch Farcaster profile:', error)
        return null
    }
}

/**
 * Compose a new cast
 * Only works in Farcaster Mini App context
 */
export async function composeCast(params: {
    text: string
    embeds?: string[]
}): Promise<boolean> {
    try {
        if (!isInFarcasterContext()) {
            console.warn('Not in Farcaster context, cannot compose cast')
            return false
        }

        await sdk.actions.composeCast({
            text: params.text,
        })
        return true
    } catch (error) {
        console.error('Error composing cast:', error)
        return false
    }
}

/**
 * Open external URL in Mini App context
 */
export async function openUrl(url: string): Promise<boolean> {
    try {
        if (!isInFarcasterContext()) {
            console.warn('Not in Farcaster context, cannot open URL')
            return false
        }

        await sdk.actions.openUrl(url)
        return true
    } catch (error) {
        console.error('Error opening URL:', error)
        return false
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
