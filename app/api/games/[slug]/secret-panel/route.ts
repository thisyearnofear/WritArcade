import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  isLitProtocolEncrypted,
  decryptFallback,
  buildDecryptRequest,
} from '@/lib/lit-protocol.service'
import { NETWORKS } from '@/lib/contracts'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const GAME_NFT_CONTRACT = '0x778C87dAA2b284982765688AE22832AADae7dccC'

/**
 * POST /api/games/[slug]/secret-panel
 * Decrypt and return the secret panel for NFT holders.
 *
 * Flow:
 * 1. Fetch game from DB with encrypted secret panel data
 * 2. Verify the requesting wallet owns the game's NFT on Base
 * 3. If NFT holder: return decrypted content (or Lit Protocol decrypt params)
 * 4. If not: return 403 with clear error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { walletAddress, gameId } = body

    if (!walletAddress || !gameId) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, gameId' },
        { status: 400 }
      )
    }

    // Validate wallet format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Fetch game with secret panel data
    const game = await prisma.game.findUnique({
      where: { id: gameId, slug },
      select: {
        id: true,
        slug: true,
        nftTokenId: true,
        secretPanelCiphertext: true,
        secretPanelDataHash: true,
        secretPanelGenerated: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (!game.secretPanelGenerated || !game.secretPanelCiphertext) {
      return NextResponse.json(
        { error: 'No secret panel available for this game' },
        { status: 404 }
      )
    }

    if (!game.nftTokenId) {
      return NextResponse.json(
        { error: 'Secret panel is not yet available (game not minted)' },
        { status: 400 }
      )
    }

    // Verify NFT ownership on Base mainnet
    const publicClient = createPublicClient({
      chain: base,
      transport: http(NETWORKS.baseMainnet.rpcUrl),
    })

    try {
      // ownerOf(tokenId) returns the address that owns this specific token
      const ownerAddress = await publicClient.readContract({
        address: GAME_NFT_CONTRACT as `0x${string}`,
        abi: [
          {
            name: 'ownerOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{ name: '', type: 'address' }],
          },
        ],
        functionName: 'ownerOf',
        args: [BigInt(game.nftTokenId)],
      })

      // Case-insensitive comparison
      if (
        (ownerAddress as string).toLowerCase() !== walletAddress.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error:
              'You do not own this game NFT. Only the NFT holder can view the secret panel.',
          },
          { status: 403 }
        )
      }
    } catch {
      // Token might not exist or RPC error
      return NextResponse.json(
        { error: 'Could not verify NFT ownership. Please try again.' },
        { status: 502 }
      )
    }

    // NFT ownership verified — decrypt and return
    const ciphertext = game.secretPanelCiphertext

    if (!isLitProtocolEncrypted(ciphertext)) {
      // Base64 fallback — decrypt directly
      const decrypted = decryptFallback(ciphertext)
      if (!decrypted) {
        return NextResponse.json(
          { error: 'Failed to decrypt secret panel' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        narrative: decrypted.narrative,
        imagePrompt: decrypted.imagePrompt,
        method: 'fallback',
      })
    }

    // Lit Protocol encrypted — return params for client-side decryption
    const decryptParams = buildDecryptRequest({
      ciphertext,
      dataToEncryptHash: game.secretPanelDataHash || '',
      tokenId: game.nftTokenId,
      walletAddress,
    })

    return NextResponse.json({
      success: true,
      litDecryptParams: decryptParams,
      method: 'lit-protocol',
    })
  } catch (error) {
    console.error('Secret panel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
