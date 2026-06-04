import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getWriterCoinById, getMintConfig } from '@/lib/writerCoins'
import { fetchCoinConfigOnChain, fetchConfiguredGameNFT } from '@/lib/contracts'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'
import { authorizeGameOwner, isWalletAddress, ownershipError } from '@/domains/games/services/game-ownership.service'
import { BASE_MAINNET_CHAIN_ID } from '@/lib/chains'
import { GameFundingService } from '@/domains/payments/services/game-funding.service'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'

interface MintRequest {
  gameId: string
  gameSlug: string
  wallet: string
  writerCoinId?: string
}

/**
 * POST /api/games/mint
 * Initiate NFT minting for a game
 * 
 * Implementation:
 * 1. Validate game exists and user owns it
 * 2. Verify writer coin is whitelisted
 * 3. Prepare metadata for IPFS upload
 * 4. Return minting payload for frontend to execute transaction
 * 5. Store transaction hash in database once minted
 */
export async function POST(request: NextRequest) {
  try {
    const body: MintRequest = await request.json()
    const { gameId, gameSlug, wallet, writerCoinId } = body

    // Validation
    if (!gameId || !gameSlug || !wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, gameSlug, wallet' },
        { status: 400 }
      )
    }

    // Validate wallet format
    if (!isWalletAddress(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Fetch game from database
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        user: true,
        payment: { include: { user: true } },
      },
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    const funding = await GameFundingService.getGameFunding(game.id)
    if (!funding) {
      return NextResponse.json(
        { error: 'This game is missing its payment token. Please contact support before minting.' },
        { status: 400 }
      )
    }

    if (writerCoinId && funding.writerCoinId !== writerCoinId) {
      return NextResponse.json(
        { error: `Mint coin mismatch: this game was created with ${funding.writerCoinId}, not ${writerCoinId}` },
        { status: 400 }
      )
    }

    const canonicalWriterCoinId = funding.writerCoinId

    // Look up mint config (handles both writer coins and MUSD) from the saved game.
    const mintConfig = getMintConfig(canonicalWriterCoinId)
    if (!mintConfig) {
      return NextResponse.json(
        { error: `Unknown payment type: ${canonicalWriterCoinId}` },
        { status: 400 }
      )
    }

    const ownership = authorizeGameOwner({ game, wallet })
    if (!ownership.authorized) {
      return NextResponse.json(
        { error: ownershipError() },
        { status: 403 }
      )
    }

    if (mintConfig.chainId === BASE_MAINNET_CHAIN_ID && !canonicalWriterCoinId.startsWith('musd')) {
      const configuredGameNFT = await fetchConfiguredGameNFT(mintConfig.chainId)
      const expectedGameNFT = mintConfig.contractAddress.toLowerCase()
      if (configuredGameNFT === '0x0000000000000000000000000000000000000000') {
        return NextResponse.json(
          { error: 'Base minting is not configured yet: WriterCoinPayment has no GameNFT set. The contract owner must call setGameNFT before minting can proceed.' },
          { status: 503 }
        )
      }
      if (configuredGameNFT.toLowerCase() !== expectedGameNFT) {
        return NextResponse.json(
          { error: `Base minting is misconfigured: WriterCoinPayment points to ${configuredGameNFT}, expected ${mintConfig.contractAddress}.` },
          { status: 503 }
        )
      }
    }

    // Check if already minted
    if (game.nftTokenId) {
      return NextResponse.json(
        { error: 'Game already minted as NFT' },
        { status: 400 }
      )
    }

    // Prepare metadata for minting
    const metadata = {
      name: game.title,
      description: game.description || `A ${game.genre} game generated from an article`,
      image: game.imageUrl || '',
      external_url: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://writersarcade.vercel.app'}/games/${game.slug}`,
      animation_url: game.gameMetadataUri || game.artifactManifestUri || undefined,
      attributes: [
        { trait_type: 'genre', value: game.genre },
        { trait_type: 'difficulty', value: game.difficulty },
        { trait_type: 'creator', value: wallet },
        { trait_type: 'created_at', value: new Date(game.createdAt).toISOString() },
        ...(game.artifactManifestUri ? [{ trait_type: 'artifact_manifest', value: game.artifactManifestUri }] : []),
      ],
    }
    const tokenURI = game.nftMetadataUri || `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`

    // Return minting payload
    // Frontend will use this to call GameNFT.mintGame() contract function
    const coin = getWriterCoinById(canonicalWriterCoinId)
    let writerReceipt: {
      writer: string
      symbol: string
      writerShare: string
    } | null = null

    if (coin) {
      try {
        const distribution = await PaymentCostService.calculateDistribution(canonicalWriterCoinId, 'mint-nft')
        const formatted = PaymentCostService.formatDistribution(distribution, coin.decimals, coin.symbol)
        writerReceipt = {
          writer: game.authorParagraphUsername || coin.writer,
          symbol: coin.symbol,
          writerShare: formatted.writerShare,
        }
      } catch {
        writerReceipt = null
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        gameId,
        wallet,
        writerCoinId: canonicalWriterCoinId,
        metadata,
        tokenURI,
        nftMetadataUri: game.nftMetadataUri,
        gameMetadataUri: game.gameMetadataUri,
        artifactManifestUri: game.artifactManifestUri,
        contractAddress: mintConfig.contractAddress,
        chainId: mintConfig.chainId,
        message: 'Prepare minting transaction. Click "Confirm" to mint as NFT.',
        estimatedCost: coin ? coin.mintCost.toString() : '0',
        symbol: coin?.symbol,
        writerReceipt,
      },
    })
  } catch (error) {
    console.error('Mint error:', error)
    return NextResponse.json(
      { error: 'Failed to prepare minting' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/games/mint
 * Confirm and store minting transaction
 * Called after NFT mint transaction succeeds on-chain
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      gameId,
      transactionHash,
      nftTokenId,
      wallet,
      contractAddress,
      chainId,
      nftMetadataUri,
      gameMetadataUri,
      artifactManifestUri,
    } = body

    if (!gameId || !transactionHash || !wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, transactionHash, wallet' },
        { status: 400 }
      )
    }

    // Validate transaction hash format
    if (!transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    if (!isWalletAddress(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        user: true,
        payment: { include: { user: true } },
      },
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    const ownership = authorizeGameOwner({ game, wallet })
    if (!ownership.authorized) {
      return NextResponse.json(
        { error: ownershipError() },
        { status: 403 }
      )
    }

    const updateData: {
      nftTokenId?: string
      nftTransactionHash: string
      nftMintedAt: Date
      nftContractAddress?: string
      nftChainId?: number
      nftMetadataUri?: string
      gameMetadataUri?: string
      artifactManifestUri?: string
    } = {
      nftTokenId: nftTokenId?.toString(),
      nftTransactionHash: transactionHash,
      nftMintedAt: new Date(),
      nftContractAddress: typeof contractAddress === 'string' ? contractAddress : undefined,
      nftChainId: typeof chainId === 'number' ? chainId : undefined,
      nftMetadataUri: typeof nftMetadataUri === 'string' ? nftMetadataUri : undefined,
      gameMetadataUri: typeof gameMetadataUri === 'string' ? gameMetadataUri : undefined,
      artifactManifestUri: typeof artifactManifestUri === 'string' ? artifactManifestUri : undefined,
    }

    // Update game with NFT details
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    })

    // Record payment for minting (if not already recorded)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        transactionHash,
        action: 'mint-nft',
      },
    })

    if (!existingPayment) {
      const funding = await GameFundingService.getGameFunding(game.id)
      const writerCoinId = funding?.writerCoinId
      if (!writerCoinId) {
        return NextResponse.json(
          { error: 'This game is missing its payment token. Please contact support before minting.' },
          { status: 400 }
        )
      }
      const isMUSD = writerCoinId.startsWith('musd')
      let mintAmount = BigInt(50 * 10 ** 18) // fallback
      if (!isMUSD) {
        const coin = getWriterCoinById(writerCoinId)
        if (coin) {
          try {
            const config = await fetchCoinConfigOnChain(coin.address)
            mintAmount = config.mintCost
          } catch {
            mintAmount = coin.mintCost
          }
        }
      }
      await prisma.payment.create({
        data: {
          id: crypto.randomUUID(),
          transactionHash,
          action: 'mint-nft',
          amount: mintAmount.toString(),
          status: 'verified',
          userId: updatedGame.userId,
          walletAddress: wallet,
          chainId: typeof chainId === 'number' ? chainId : null,
          writerCoinId,
          verifiedAt: new Date(),
        },
      })
    }

    // Phase 11: Extract reusable assets from the minted game (non-blocking)
    // Returns asset IDs so the client can register derivative IPs on Story Protocol
    const extractedAssetIds = await GameDatabaseService.extractAndSaveGameAssets(gameId)

    return NextResponse.json({
      success: true,
      data: {
        gameId,
        nftTokenId,
        transactionHash,
        status: 'minted',
        message: 'NFT minting complete!',
        // Derivative IP wiring: client should call storyClient.ipAsset.registerDerivativeIp()
        // using the game's Story Protocol IP ID (registered separately via IPRegistrationFlow)
        extractedAssetIds,
      },
    })
  } catch (error) {
    console.error('Mint confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm minting' },
      { status: 500 }
    )
  }
}
