import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { logger } from '@/lib/config'

/**
 * POST /api/games/[slug]/inco-store
 *
 * After an NFT is minted, this route encrypts the game's secret panel
 * and stores it on-chain via SecretPanelVault.storeSecretPanel().
 *
 * The caller (mint confirmation flow) provides the tokenId. The server uses
 * a VAULT_MANAGER_ROLE wallet to call the contract.
 *
 * This is non-blocking: if it fails, the game still works — the secret panel
 * just won't be available via Inco (the CDR fallback remains for legacy games).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { nftTokenId } = body

    if (!nftTokenId) {
      return NextResponse.json({ error: 'nftTokenId is required' }, { status: 400 })
    }

    if (!config.features.inco) {
      return NextResponse.json({ error: 'Inco feature is disabled' }, { status: 400 })
    }

    const vaultAddress = process.env.NEXT_PUBLIC_SECRET_PANEL_VAULT_ADDRESS
    if (!vaultAddress) {
      return NextResponse.json({ error: 'SecretPanelVault address not configured' }, { status: 500 })
    }

    const game = await prisma.game.findUnique({ where: { slug } })
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (!game.secretPanelCiphertext) {
      return NextResponse.json({ error: 'No secret panel to store' }, { status: 400 })
    }

    // The server-side wallet that has VAULT_MANAGER_ROLE on the vault contract.
    // This is the same key used for Story CDR vaulting, repurposed for Inco.
    const managerPrivateKey = process.env.INCO_VAULT_MANAGER_PRIVATE_KEY ||
                              process.env.STORY_PLATFORM_PRIVATE_KEY
    if (!managerPrivateKey) {
      logger.error('No VAULT_MANAGER private key configured for Inco encryption')
      return NextResponse.json({ error: 'Server wallet not configured' }, { status: 500 })
    }

    // Encrypt the secret panel via Inco SDK
    const { encryptSecretPanel, getVaultAddress, SECRET_PANEL_VAULT_ABI } = await import('@/lib/daily-challenge/inco')
    const { createWalletClient, http } = await import('viem')
    const { base } = await import('viem/chains')
    const { privateKeyToAccount } = await import('viem/accounts')

    const account = privateKeyToAccount(managerPrivateKey as `0x${string}`)
    const vaultContractAddress = getVaultAddress()

    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http('https://mainnet.base.org'),
    })

    // Encrypt the secret panel JSON into ≤31-byte chunks
    const ciphertextChunks = await encryptSecretPanel(game.secretPanelCiphertext, account.address)

    const { getIncoFee } = await import('@/lib/daily-challenge/inco')
    const unitFee = await getIncoFee()
    const fee = unitFee * BigInt(ciphertextChunks.length)

    const txHash = await walletClient.writeContract({
      address: vaultContractAddress,
      abi: SECRET_PANEL_VAULT_ABI,
      functionName: 'storeSecretPanel',
      args: [BigInt(nftTokenId), ciphertextChunks],
      value: fee,
      account,
    })

    // Wait for transaction receipt
    const { createPublicClient } = await import('viem')
    const publicClient = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    if (receipt.status === 'success') {
      // Clear the plaintext from the DB now that it's encrypted on-chain
      await prisma.game.update({
        where: { id: game.id },
        data: {
          secretPanelCiphertext: null,
          promptVaultUuid: `inco:${nftTokenId}`, // Mark as Inco-stored
        },
      })

      logger.info('Secret panel stored on-chain via Inco', {
        gameId: game.id,
        nftTokenId,
        txHash,
      })

      return NextResponse.json({
        success: true,
        nftTokenId,
        txHash,
        encryption: 'inco',
      })
    } else {
      logger.error('Inco storeSecretPanel transaction failed', null, {
        gameId: game.id,
        txHash,
        status: receipt.status,
      })
      return NextResponse.json(
        { error: 'On-chain storage transaction failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Inco secret panel storage failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store secret panel' },
      { status: 500 }
    )
  }
}
