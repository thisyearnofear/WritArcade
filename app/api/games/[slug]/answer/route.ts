import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/services/auth'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { authorizeGameOwner } from '@/domains/games/services/game-ownership.service'

const SECRET_PANEL_VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_SECRET_PANEL_VAULT_ADDRESS as `0x${string}` | undefined) || ''

const SECRET_PANEL_VAULT_ABI = [
  {
    name: 'getWordleAnswerHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'hasWordleAnswer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

/**
 * Authorizes a player to read a Wordle answer.
 *
 * With Inco: the answer is encrypted on-chain as an euint256 handle.
 * This endpoint returns the handle; the client decrypts via attestedDecrypt.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    await request.json().catch(() => ({}))

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null

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

    // Check game is accessible (public or the requester is the authenticated owner)
    const isPublic = !game.private
    const ownership = authorizeGameOwner({ game, wallet: actorWallet ?? undefined })

    if (!isPublic && !ownership.authorized) {
      return NextResponse.json({ error: 'This game is private' }, { status: 403 })
    }

    // Read the Inco handle from SecretPanelVault on-chain
    if (SECRET_PANEL_VAULT_ADDRESS && game.nftTokenId) {
      try {
        const { createPublicClient, http } = await import('viem')
        const { base } = await import('viem/chains')

        const publicClient = createPublicClient({
          chain: base,
          transport: http('https://mainnet.base.org'),
        })

        const hasAnswer = await publicClient.readContract({
          address: SECRET_PANEL_VAULT_ADDRESS,
          abi: SECRET_PANEL_VAULT_ABI,
          functionName: 'hasWordleAnswer',
          args: [BigInt(game.nftTokenId)],
        })

        if (hasAnswer) {
          const handle = await publicClient.readContract({
            address: SECRET_PANEL_VAULT_ADDRESS,
            abi: SECRET_PANEL_VAULT_ABI,
            functionName: 'getWordleAnswerHandle',
            args: [BigInt(game.nftTokenId)],
          })

          return NextResponse.json({
            incoHandle: handle as string,
            vaultAddress: SECRET_PANEL_VAULT_ADDRESS,
            status: 'ready_for_decryption',
          })
        }
      } catch (err) {
        console.error('[Wordle Answer] Failed to read Inco handle:', err)
      }
    }

    return NextResponse.json(
      { error: 'No Inco handle found for this game. The game may not be minted yet.' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Wordle answer access failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
