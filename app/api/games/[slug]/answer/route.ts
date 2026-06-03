import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { authorizeGameOwner, isWalletAddress } from '@/domains/games/services/game-ownership.service'

/**
 * Authorizes a player to read a Wordle answer from its CDR vault.
 *
 * The actual decryption happens client-side via the CDR SDK and the user's wallet.
 * This endpoint acts as a server-side gate: it verifies the game exists, has a
 * vaulted answer, and the requesting wallet is authorized.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { walletAddress } = body

    if (!isWalletAddress(walletAddress)) {
      return NextResponse.json({ error: 'Valid wallet address is required' }, { status: 400 })
    }

    const game = await GameDatabaseService.getGameBySlug(slug)

    if (!game || game.mode !== 'wordle') {
      return NextResponse.json({ error: 'Wordle game not found' }, { status: 404 })
    }

    if (!game.wordleAnswerVaultUuid) {
      return NextResponse.json(
        { error: 'No vaulted answer available for this game' },
        { status: 404 }
      )
    }

    // Check game is accessible (public or the requester is the owner)
    const isPublic = !game.private
    const ownership = authorizeGameOwner({ game, wallet: walletAddress })

    if (!isPublic && !ownership.authorized) {
      return NextResponse.json({ error: 'This game is private' }, { status: 403 })
    }

    return NextResponse.json({
      vaultUuid: game.wordleAnswerVaultUuid,
      status: 'ready_for_decryption',
    })

  } catch (error) {
    console.error('Wordle answer vault access failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
