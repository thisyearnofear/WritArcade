'use client'

import { Game } from '../../types'

interface GameStatusScreensProps {
    game: Game
}

export function GameStatusScreens({ game }: GameStatusScreensProps) {
    if (game.approvalStatus === 'rejected') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="max-w-md text-center space-y-6">
                    <div className="text-6xl">❌</div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Game Rejected</h2>
                        <p className="text-gray-400 mb-2">{game.rejectionReason || 'This game did not match the article themes.'}</p>
                        <p className="text-gray-400 text-sm">You can regenerate and try again.</p>
                    </div>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    if (game.approvalStatus === 'pending') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="max-w-md text-center space-y-6">
                    <div className="text-6xl">⏳</div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Game Awaiting Review</h2>
                        <p className="text-gray-400">This game needs to be approved before you can play. Review it and confirm it matches the original article.</p>
                    </div>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return null
}
