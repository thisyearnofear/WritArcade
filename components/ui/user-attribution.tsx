/**
 * User Attribution Component
 * Reusable component for displaying user identity with rich profiles
 * Used for game creators, article authors, etc.
 */

'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, User } from 'lucide-react'
import { userIdentityService } from '@/lib/services/user-identity.service'
import type { GameCreator, GameAuthor } from '@/lib/services/ipfs-metadata.service'

interface UserAttributionProps {
  type: 'creator' | 'author'
  walletAddress?: string
  paragraphUsername?: string
  authorWallet?: string
  size?: 'sm' | 'md' | 'lg'
  showLink?: boolean
  className?: string
}

export function UserAttribution({
  type,
  walletAddress,
  paragraphUsername,
  authorWallet,
  size = 'md',
  showLink = true,
  className = ''
}: UserAttributionProps) {
  const [userData, setUserData] = useState<GameCreator | GameAuthor | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUserData() {
      try {
        if (type === 'creator' && walletAddress) {
          const creator = await userIdentityService.getGameCreator(walletAddress)
          setUserData(creator)
        } else if (type === 'author' && paragraphUsername) {
          const author = await userIdentityService.getGameAuthor(paragraphUsername, authorWallet)
          setUserData(author)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [type, walletAddress, paragraphUsername, authorWallet])

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`
          rounded-full bg-gray-700 animate-pulse
          ${size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}
        `} />
        <div className="h-4 bg-gray-700 rounded animate-pulse w-20" />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <User className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
        <span className={size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}>
          Unknown {type}
        </span>
      </div>
    )
  }

  const isCreator = type === 'creator' && 'farcasterUsername' in userData
  const isAuthor = type === 'author' && 'profileUrl' in userData

  const avatarSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
  
  const linkUrl = isAuthor 
    ? (userData as GameAuthor).profileUrl
    : isCreator && (userData as GameCreator).farcasterUsername
    ? `https://warpcast.com/${(userData as GameCreator).farcasterUsername}`
    : undefined

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar */}
      <div className={`${avatarSize} rounded-full overflow-hidden bg-gray-800 flex-shrink-0`}>
        {('avatar' in userData && userData.avatar) ? (
          <img 
            src={userData.avatar} 
            alt={userData.displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to identicon if image fails
              const target = e.target as HTMLImageElement
              target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${userData.walletAddress || 'default'}`
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
            <User className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Name and role */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${textSize}`}>
          {userData.displayName}
        </div>
        {size !== 'sm' && (
          <div className="text-xs text-gray-500 truncate">
            {type === 'creator' ? 'Game Creator' : 'Article Author'}
          </div>
        )}
      </div>

      {/* External link icon */}
      {showLink && linkUrl && (
        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
      )}
    </div>
  )

  // Wrap in link if we have one
  if (showLink && linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors"
        title={`View ${userData.displayName}'s profile`}
      >
        {content}
      </a>
    )
  }

  return content
}

interface AttributionPairProps {
  creatorWallet: string
  authorParagraphUsername: string
  authorWallet?: string
  size?: 'sm' | 'md' | 'lg'
  layout?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Display both creator and author attribution together
 */
export function AttributionPair({
  creatorWallet,
  authorParagraphUsername,
  authorWallet,
  size = 'md',
  layout = 'vertical',
  className = ''
}: AttributionPairProps) {
  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <UserAttribution 
          type="creator" 
          walletAddress={creatorWallet} 
          size={size}
        />
        <div className="w-px h-6 bg-gray-600" />
        <UserAttribution 
          type="author" 
          paragraphUsername={authorParagraphUsername}
          authorWallet={authorWallet}
          size={size}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <UserAttribution 
        type="creator" 
        walletAddress={creatorWallet} 
        size={size}
      />
      <UserAttribution 
        type="author" 
        paragraphUsername={authorParagraphUsername}
        authorWallet={authorWallet}
        size={size}
      />
    </div>
  )
}