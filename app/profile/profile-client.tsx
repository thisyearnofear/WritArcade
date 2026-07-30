'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getDisplayName, getAvatarUrl } from '@/domains/farcaster/services/farcaster'
import { UserPreferencesForm } from '@/domains/users/components/user-profile-form'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { AISettingsWrapper } from '@/components/settings/AISettingsWrapper'

interface User {
  id: string
  walletAddress: string
  preferredModel: string
  private: boolean
  isCreator: boolean
  isAdmin: boolean
}

interface Game {
  id: string
  slug: string
  title: string
  description: string
  genre: string
  subgenre: string
  private: boolean
  createdAt: string
}

export function ProfileClient() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userGames, setUserGames] = useState<Game[]>([])
  const [displayName, setDisplayName] = useState<string>('User')
  const [avatarUrl, setAvatarUrl] = useState<string>('/default-avatar.png')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch('/api/auth/me')
        if (!userRes.ok) {
          router.push('/')
          return
        }

        const userData = await userRes.json()
        if (!userData.success) {
          router.push('/')
          return
        }

        setUser(userData.user)

        const name = await getDisplayName(userData.user.walletAddress)
        const avatar = await getAvatarUrl(userData.user.walletAddress)
        setDisplayName(name || 'User')
        setAvatarUrl(avatar || '/default-avatar.png')

        const gamesRes = await fetch(`/api/games/my-games?wallet=${encodeURIComponent(userData.user.walletAddress)}&limit=100`)
        if (gamesRes.ok) {
          const gamesData = await gamesRes.json()
          setUserGames(gamesData.data?.games || [])
        }

        setLoading(false)
      } catch (error) {
        console.error('Profile load error:', error)
        router.push('/')
      }
    }
    loadData()
  }, [router])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <ThemeWrapper theme="arcade">
      <div className="min-h-screen flex flex-col">
        <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full border-2 border-purple-500"
              />
              <div>
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <p className="text-muted-foreground">
                  Manage your account, preferences, and game creation settings
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Game Preferences</h2>
                <UserPreferencesForm user={user} />
              </div>

              <AISettingsWrapper />

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet</span>
                    <span className="font-medium text-xs font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Games Created</span>
                    <span className="font-medium">{userGames.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Model</span>
                    <span className="font-medium">{user.preferredModel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Your Games</h2>
                <p className="text-muted-foreground">
                  {userGames.length === 0
                    ? "You haven't created any games yet. Start creating!"
                    : `You've created ${userGames.length} game${userGames.length === 1 ? '' : 's'}`
                  }
                </p>
              </div>

              {userGames.length > 0 ? (
                <div className="space-y-6">
                  {userGames.map((game) => (
                    <div
                      key={game.id}
                      className="bg-muted/50 rounded-lg border border-border p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{game.title}</h3>
                          <p className="text-muted-foreground mb-3">{game.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{game.genre} • {game.subgenre}</span>
                            <span>•</span>
                            <span>{new Date(game.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{game.private ? 'Private' : 'Public'}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`/games/${game.slug}`}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                          >
                            Play
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/20 rounded-lg border border-border">
                  <p className="text-muted-foreground mb-4">No games created yet</p>
                  <a
                    href="/generate"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                  >
                    Create Your First Game
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      </div>
    </ThemeWrapper>
  )
}
