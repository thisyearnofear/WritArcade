/**
 * Farcaster Social Sharing Service
 * 
 * Provides a unified API for generating Farcaster-native shareable casts.
 * This is the single source of truth for social integration.
 */

import { type Game } from '@/domains/games/types'

// SDK reference — loaded lazily via dynamic import (no require() in browser bundles)
let sdk: { actions: { share: (params: { text: string; url: string }) => Promise<unknown> } } | null = null

async function getSDK() {
    if (sdk) return sdk
    if (typeof window === 'undefined') return null
    try {
        const farcasterModule = await import('@farcaster/miniapp-sdk')
        if (farcasterModule && farcasterModule.sdk) {
            sdk = farcasterModule.sdk as unknown as typeof sdk
        }
    } catch {
        // SDK not available, silent fail (web app fallback)
    }
    return sdk
}

/**
 * Trigger a native Farcaster share action
 */
export async function shareGame(game: Game): Promise<boolean> {
    const resolvedSdk = await getSDK()
    if (!resolvedSdk) {
        console.warn('[FarcasterSharing] SDK not available')
        return false
    }

    try {
        const shareUrl = `${window.location.origin}/games/${game.slug}`
        const text = `I just archived my experience in "${game.title}"! Play it here.`
        
        await resolvedSdk.actions.share({
            text,
            url: shareUrl,
        })
        
        return true
    } catch (error) {
        console.error('[FarcasterSharing] Share failed:', error)
        return false
    }
}
