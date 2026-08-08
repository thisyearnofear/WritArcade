import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getActor } from '@/services/auth'
import { uploadToIPFS } from '@/domains/story/services/ipfs-utils'
import { authorizeGameOwner, ownershipError } from '@/domains/games/services/game-ownership.service'

const artifactPanelSchema = z.object({
  id: z.string().optional(),
  narrativeText: z.string().trim().min(1).max(12000),
  imageUrl: z.string().trim().url().optional().nullable(),
  imageModel: z.string().trim().max(120).optional().nullable(),
  userChoice: z.string().trim().max(4000).optional().nullable(),
  audioUrl: z.string().trim().url().optional().nullable(),
})

const artifactSchema = z.object({
  panels: z.array(artifactPanelSchema).min(1).max(8),
})

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://writersarcade.vercel.app'
  ).replace(/\/$/, '')
}

function shortWallet(wallet?: string | null) {
  if (!wallet) return 'Unknown'
  if (!wallet.startsWith('0x') || wallet.length < 12) return wallet
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = artifactSchema.parse(await request.json())

    const actor = await getActor()
    const actorWallet = actor?.identity === 'wallet' ? actor.user.walletAddress?.toLowerCase() : null
    if (!actorWallet) {
      return NextResponse.json({ error: 'Wallet authentication is required' }, { status: 401 })
    }

    const game = await prisma.game.findUnique({
      where: { slug },
      include: {
        user: true,
        payment: { include: { user: true } },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const ownership = authorizeGameOwner({ game, wallet: actorWallet })
    if (!ownership.authorized) {
      return NextResponse.json({ error: ownershipError() }, { status: 403 })
    }

    const createdAt = new Date().toISOString()
    const creatorWallet = game.ownerWallet || game.creatorWallet || actorWallet
    const panels = body.panels.map((panel, index) => ({
      id: panel.id || `${game.id}-panel-${index + 1}`,
      panelIndex: index,
      panelNumber: index + 1,
      narrativeText: panel.narrativeText,
      imageUrl: panel.imageUrl || null,
      imageModel: panel.imageModel || null,
      userChoice: panel.userChoice || null,
      audioUrl: panel.audioUrl || null,
    }))

    const manifest = {
      schema: 'writersarcade.game-artifact.v1',
      game: {
        id: game.id,
        slug: game.slug,
        title: game.title,
        description: game.description,
        genre: game.genre,
        subgenre: game.subgenre,
        difficulty: game.difficulty || null,
        articleUrl: game.articleUrl || null,
        imageUrl: game.imageUrl || null,
        url: `${siteUrl()}/games/${game.slug}`,
      },
      creator: {
        walletAddress: creatorWallet,
        displayName: shortWallet(creatorWallet),
      },
      author: {
        paragraphUsername: game.authorParagraphUsername || null,
        walletAddress: game.authorWallet || null,
        publicationName: game.publicationName || null,
      },
      panels,
      createdAt,
      totalPanels: panels.length,
    }

    const gameMetadataUri = await uploadToIPFS(manifest)
    const nftMetadata = {
      name: game.title,
      description: game.description || `A ${game.genre} comic game created with writersarcade`,
      image: panels.find(panel => panel.imageUrl)?.imageUrl || game.imageUrl || '',
      external_url: `${siteUrl()}/games/${game.slug}`,
      animation_url: gameMetadataUri,
      attributes: [
        { trait_type: 'Genre', value: game.genre },
        { trait_type: 'Subgenre', value: game.subgenre },
        { trait_type: 'Difficulty', value: game.difficulty || 'medium' },
        { trait_type: 'Panels', value: panels.length },
        { trait_type: 'Creator', value: shortWallet(creatorWallet) },
        { trait_type: 'Author', value: game.authorParagraphUsername || game.publicationName || 'Unknown' },
        { trait_type: 'Platform', value: 'writersarcade' },
        { trait_type: 'Artifact Manifest', value: gameMetadataUri },
      ],
      panels,
      creator: manifest.creator,
      author: manifest.author,
      articleUrl: game.articleUrl || null,
      createdAt,
      totalPanels: panels.length,
      gameVersion: '1.0',
    }
    const nftMetadataUri = await uploadToIPFS(nftMetadata)

    await prisma.$transaction([
      prisma.game.update({
        where: { id: game.id },
        data: {
          artifactManifestUri: gameMetadataUri,
          artifactSavedAt: new Date(createdAt),
          gameMetadataUri,
          nftMetadataUri,
        },
      }),
      ...panels.map(panel => (
        prisma.gameArtifactPanel.upsert({
          where: {
            gameId_panelIndex: {
              gameId: game.id,
              panelIndex: panel.panelIndex,
            },
          },
          update: {
            narrativeText: panel.narrativeText,
            imageUrl: panel.imageUrl,
            imageModel: panel.imageModel,
            userChoice: panel.userChoice,
            audioUrl: panel.audioUrl,
          },
          create: {
            gameId: game.id,
            panelIndex: panel.panelIndex,
            narrativeText: panel.narrativeText,
            imageUrl: panel.imageUrl,
            imageModel: panel.imageModel,
            userChoice: panel.userChoice,
            audioUrl: panel.audioUrl,
          },
        })
      )),
    ])

    return NextResponse.json({
      success: true,
      data: {
        gameId: game.id,
        gameMetadataUri,
        nftMetadataUri,
        artifactManifestUri: gameMetadataUri,
        panelsSaved: panels.length,
      },
    })
  } catch (error) {
    console.error('[GameArtifact] Save error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid artifact payload', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save artifact' },
      { status: 500 }
    )
  }
}
