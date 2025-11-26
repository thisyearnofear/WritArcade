import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getDisplayName, getAvatarUrl } from '@/lib/farcaster'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { UserPreferencesForm } from '@/domains/users/components/user-profile-form'
import { GameGrid } from '@/domains/games/components/game-grid'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/') // Redirect to home, wallet connect will be shown
  }

  // Get user's game statistics
  const userGames = await GameDatabaseService.getUserGames(user.id, 100)

  // Fetch Farcaster profile
  const displayName = await getDisplayName(user.walletAddress)
  const avatarUrl = await getAvatarUrl(user.walletAddress)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full border-2 border-purple-500"
              />
              <div>
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <p className="text-gray-400">
                  Manage your account, preferences, and game creation settings
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Preferences Settings */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4">Game Preferences</h2>
                <UserPreferencesForm user={user} />
              </div>

              {/* Stats */}
              <div className="mt-6 bg-gray-900/50 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wallet</span>
                    <span className="font-medium text-xs font-mono">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Games Created</span>
                    <span className="font-medium">{userGames.games.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">AI Model</span>
                    <span className="font-medium">{user.preferredModel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User's Games */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Your Games</h2>
                <p className="text-gray-400">
                  {userGames.games.length === 0
                    ? "You haven't created any games yet. Start creating!"
                    : `You've created ${userGames.games.length} game${userGames.games.length === 1 ? '' : 's'}`
                  }
                </p>
              </div>

              {userGames.games.length > 0 ? (
                <div className="space-y-6">
                  {userGames.games.map((game) => (
                    <div
                      key={game.id}
                      className="bg-gray-800/50 rounded-lg border border-gray-700 p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{game.title}</h3>
                          <p className="text-gray-400 mb-3">{game.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                <div className="text-center py-12 bg-gray-800/20 rounded-lg border border-gray-700">
                  <p className="text-gray-400 mb-4">No games created yet</p>
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
  )
}

export const metadata = {
  title: 'Profile - WritArcade',
  description: 'Manage your WritArcade profile and settings',
}