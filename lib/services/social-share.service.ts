/**
 * Social sharing service - Single source of truth for all sharing logic
 * Consolidates share functionality across writersarcade components
 */

export interface ShareData {
  title: string
  text: string
  url?: string
  hashtags?: string[]
}

export interface ComicShareData extends ShareData {
  genre: string
  panelCount: number
  gameTitle: string
  twist?: string // User's IRL insight or creative twist
  author?: string // Original article author
  videoUrl?: string | null // Optional animated video URL
}

export class SocialShareService {
  private static instance: SocialShareService

  public static getInstance(): SocialShareService {
    if (!SocialShareService.instance) {
      SocialShareService.instance = new SocialShareService()
    }
    return SocialShareService.instance
  }

  /**
   * Share to Twitter with optimized formatting
   */
  public shareToTwitter(data: ComicShareData): void {
    let tweetText = ''
    const videoSuffix = data.videoUrl ? `\n\n🎬 Watch it move: ${data.videoUrl}` : ''

    if (data.twist && data.author) {
      // Use minting language only when the caller explicitly supplies it.
      tweetText = `I read ${data.author}'s article, turned it into a ${data.genre} comic about ${data.twist}, and made my own ending on @writersarcade! 🎮📚${videoSuffix}\n\nCheck out "${data.gameTitle}" 👇`
    } else {
      // Completion copy is supplied by the product surface so the share has
      // a specific ending and a clear invitation, not just a feature claim.
      const animatedNote = data.videoUrl ? ' Animated panels included 🎬' : ''
      tweetText = `${data.text || `Just created "${data.gameTitle}" — an interactive ${data.genre} comic where your choices shape the story.`}${animatedNote} 🎮📚${videoSuffix}\n\n#writersarcade #AIComics`
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(data.url || window.location.href)}`
    this.openSocialWindow(twitterUrl, { width: 550, height: 420 })
  }

  /**
   * Share to Farcaster via Warpcast
   */
  public shareToFarcaster(data: ComicShareData): void {
    let castText = ''
    const videoLine = data.videoUrl ? `\n\n🎬 Animated version: ${data.videoUrl}` : ''

    if (data.twist && data.author) {
      // Keep the invite focused on the creative result, not an unverified mint.
      castText = `I read ${data.author}'s article, turned it into a ${data.genre} comic, and made my own ending!${videoLine}\n\nCheck out "${data.gameTitle}" on writersarcade 👇`
    } else {
      castText = `${data.text || `Just dropped my new comic "${data.gameTitle}" on writersarcade!`} 🎮📚\n\n${data.genre} story • ${data.panelCount} interactive panels${data.videoUrl ? ' • Animated panels 🎬' : ''} • every choice shapes the narrative${videoLine}`
    }

    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(data.url || window.location.href)}`
    this.openSocialWindow(farcasterUrl, { width: 600, height: 500 })
  }

  /**
   * Share to LinkedIn
   */
  public shareToLinkedIn(data: ComicShareData): void {
    // LinkedIn only supports URL sharing via intent, text is pre-filled but not fully customizable via URL param in the same way
    // But we can try the 'summary' or just rely on OG tags. 
    // Best effort: just open the share dialog for the URL.
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url || window.location.href)}`
    this.openSocialWindow(linkedinUrl, { width: 600, height: 600 })
  }

  /**
   * Generic share using Web Share API or clipboard fallback
   */
  public async shareGeneric(data: ShareData): Promise<boolean> {
    const shareData = {
      title: data.title,
      text: data.text,
      url: data.url || window.location.href,
    }

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return true
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        return true
      }
    } catch (error) {
      console.error('Error sharing:', error)
      // Final fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Open social media window with consistent dimensions
   */
  private openSocialWindow(url: string, options: { width: number; height: number }): void {
    const left = (window.screen.width - options.width) / 2
    const top = (window.screen.height - options.height) / 2

    window.open(
      url,
      '_blank',
      `width=${options.width},height=${options.height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    )
  }
}

// Export singleton instance
export const socialShareService = SocialShareService.getInstance()