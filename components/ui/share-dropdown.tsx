/**
 * Reusable share dropdown component
 * Enhances existing UI patterns instead of creating new ones
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Twitter, MessageCircle, Linkedin } from 'lucide-react'
import { socialShareService, type ComicShareData } from '@/lib/services/social-share.service'
import { trackEvent } from '@/services/analytics'

interface ShareDropdownProps {
  data: ComicShareData
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  buttonClassName?: string
  surface?: string
}

export function ShareDropdown({
  data,
  variant = 'outline',
  size = 'default',
  className = '',
  buttonClassName = '',
  surface,
}: ShareDropdownProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleTwitterShare = () => {
    trackEvent('share_clicked', { surface, channel: 'twitter', url: data.url })
    socialShareService.shareToTwitter(data)
    setShowMenu(false)
  }

  const handleFarcasterShare = () => {
    trackEvent('share_clicked', { surface, channel: 'farcaster', url: data.url })
    socialShareService.shareToFarcaster(data)
    setShowMenu(false)
  }

  const handleLinkedInShare = () => {
    trackEvent('share_clicked', { surface, channel: 'linkedin', url: data.url })
    socialShareService.shareToLinkedIn(data)
    setShowMenu(false)
  }

  const handleGenericShare = async () => {
    trackEvent('share_clicked', { surface, channel: 'native_or_copy', url: data.url })
    const success = await socialShareService.shareGeneric(data)
    if (success) {
      // Could add toast notification here if needed
    }
    setShowMenu(false)
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <Button
        variant={variant}
        size={size}
        className={`gap-2 ${buttonClassName}`}
        onClick={() => setShowMenu(!showMenu)}
        title="Share your comic"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-full left-0 mb-2 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl z-20 min-w-[200px]">
            <div className="p-2 space-y-1">
              <button
                onClick={handleTwitterShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/10 rounded-md transition-colors text-left"
              >
                <Twitter className="w-4 h-4 text-blue-400" />
                <span>Share on Twitter</span>
              </button>

              <button
                onClick={handleFarcasterShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/10 rounded-md transition-colors text-left"
              >
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <span>Cast on Farcaster</span>
              </button>

              <button
                onClick={handleLinkedInShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/10 rounded-md transition-colors text-left"
              >
                <Linkedin className="w-4 h-4 text-blue-600" />
                <span>Share on LinkedIn</span>
              </button>

              <button
                onClick={handleGenericShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/10 rounded-md transition-colors text-left"
              >
                <Share2 className="w-4 h-4 text-muted-foreground" />
                <span>Other / Copy Link</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
