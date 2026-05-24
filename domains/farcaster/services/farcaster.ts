/**
 * Farcaster Integration Utilities
 *
 * Provides functions to interact with Farcaster Mini Apps for:
 * - User profile data (username, avatar, bio)
 * - Mini App SDK integration for actions and context
 * - Social features (sharing, wallet)
 */

export interface FarcasterUser {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
    location?: {
        placeId: string
        description: string
    }
}

export interface FarcasterContext {
    user: FarcasterUser
    client: {
        added: boolean
        safeAreaInsets?: {
            top: number
            bottom: number
            left: number
            right: number
        }
    }
}

interface FarcasterSdk {
  context: Promise<FarcasterContext | null>
  actions: {
    ready: () => Promise<void>
    composeCast: (params: { text: string; embeds?: string[] }) => Promise<void>
    openUrl: (url: string) => Promise<void>
    close: () => void
  }
}

// Lazy load SDK to avoid SSR issues
let sdk: FarcasterSdk | null = null
const getSdk = async (): Promise<FarcasterSdk> => {
    if (typeof window === 'undefined') {
        // Return mock SDK for server-side rendering
        return { 
            context: Promise.resolve(null), 
            actions: { 
                ready: async () => {}, 
                composeCast: async () => {}, 
                openUrl: async () => {},
                close: () => {}
            } 
        }
    }
    if (!sdk) {
        const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk')
        sdk = farcasterSdk as unknown as FarcasterSdk
    }
    return sdk
}

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
export async function getFarcasterContext(): Promise<FarcasterContext | null> {
    try {
        const farcasterSdk = await getSdk()
        const context = await farcasterSdk.context
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
        const farcasterSdk = await getSdk()
        await farcasterSdk.actions.ready()
    } catch (error) {
        console.error('Failed to signal ready:', error)
    }
}

/**
 * Check if app is running in Farcaster context
 */
export async function isInFarcasterContext(): Promise<boolean> {
    try {
        if (typeof window === 'undefined') return false
        const farcasterSdk = await getSdk()
        const context = await farcasterSdk.context
        return context !== null
    } catch {
        return false
    }
}

/**
 * Get Farcaster profile for a wallet address
 * Proxies through backend API to keep Neynar key secure
 */
export async function getFarcasterProfile(
    walletAddress: string
): Promise<FarcasterProfile | null> {
    try {
        // Validate wallet address format
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            console.warn('Invalid wallet address format:', walletAddress)
            return null
        }

        // Use backend proxy to keep API key secure
        const response = await fetch(
            `/api/farcaster/profile?walletAddress=${encodeURIComponent(walletAddress)}`
        )

        if (!response.ok) {
            console.error('Profile lookup failed:', response.status)
            return null
        }

        const data = await response.json()

        // Check if profile exists
        if (!data.fid || !data.username) {
            return null
        }

        return {
            fid: data.fid,
            username: data.username,
            displayName: data.displayName,
            bio: data.bio,
            pfpUrl: data.pfpUrl,
            verifiedAddresses: data.verifiedAddresses || [],
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
        if (!(await isInFarcasterContext())) {
            console.warn('Not in Farcaster context, cannot compose cast')
            return false
        }

        const farcasterSdk = await getSdk()
        await farcasterSdk.actions.composeCast({
            text: params.text,
            embeds: params.embeds,
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
        if (!(await isInFarcasterContext())) {
            console.warn('Not in Farcaster context, cannot open URL')
            return false
        }

        const farcasterSdk = await getSdk()
        await farcasterSdk.actions.openUrl(url)
        return true
    } catch (error) {
        console.error('Error opening URL:', error)
        return false
    }
}

/**
 * Close the mini app
 */
export async function closeMiniApp(): Promise<void> {
    try {
        const farcasterSdk = await getSdk()
        farcasterSdk.actions.close()
    } catch (error) {
        console.error('Error closing mini app:', error)
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

