/**
 * Farcaster Social Sharing Service
 * 
 * Provides a unified API for generating Farcaster-native shareable casts.
 * This is the single source of truth for social integration.
 */

import { type Game } from '@/domains/games/types'

// SDK reference
let sdk: { actions: { share: (params: { text: string; url: string }) => Promise<unknown> } } | null = null

// Load SDK lazily
if (typeof window !== 'undefined') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const farcasterModule = require('@farcaster/miniapp-sdk')
        if (farcasterModule && farcasterModule.sdk) {
            sdk = farcasterModule.sdk
        }
    } catch {
        // SDK not available, silent fail (web app fallback)
    }
}

/**
 * Trigger a native Farcaster share action
 */
export async function shareGame(game: Game): Promise<boolean> {
    if (!sdk) {
        console.warn('[FarcasterSharing] SDK not available')
        return false
    }

    try {
        const shareUrl = `${window.location.origin}/games/${game.slug}`
        const text = `I just archived my experience in "${game.title}"! Play it here.`
        
        await sdk.actions.share({
            text,
            url: shareUrl,
        })
        
        return true
    } catch (error) {
        console.error('[FarcasterSharing] Share failed:', error)
        return false
    }
}
