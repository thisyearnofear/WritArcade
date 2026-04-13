'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import type { Game } from '@/domains/games/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function DiscoveryPage() {
    const [games, setGames] = useState<Game[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const fetchGames = async () => {
            try {
                // Fetch public games
                const data = await GameDatabaseService.getGames({ limit: 10 })
                setGames(data.games)
            } catch (err) {
                console.error("Failed to fetch games:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchGames()
    }, [])

    if (loading) return <div className="text-white p-8">Loading Arcade...</div>

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-white uppercase italic">Trending Arcade Games</h2>
            <div className="grid gap-4">
                {games.map(game => (
                    <Card 
                        key={game.id} 
                        className="bg-white/5 border-white/10 cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => router.push(`/mini-app/play/${game.slug}`)}
                    >
                        <CardHeader>
                            <CardTitle className="text-white text-lg">{game.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-purple-200/60 line-clamp-2">{game.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
