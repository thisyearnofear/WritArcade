import { NextRequest, NextResponse } from 'next/server'
import { AssetDatabaseService } from '@/domains/assets/services/asset-database.service'
import { StoryProtocolAssetService } from '@/domains/assets/services/story-protocol.service'
import { prisma } from '@/lib/database'

/**
 * POST /api/assets/[id]/register
 * 
 * Register an asset as IP on Story Protocol
 * 
 * Body:
 * {
 *   creatorWallet: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params
    const body = await request.json()
    const { creatorWallet } = body

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    if (!creatorWallet) {
      return NextResponse.json(
        { error: 'Creator wallet is required' },
        { status: 400 }
      )
    }

    // Get asset from database
    const asset = await AssetDatabaseService.getAssetById(assetId)
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Check if already registered
    const existingRegistration = await prisma.assetStoryRegistration.findUnique({
      where: { assetId },
    })

    if (existingRegistration) {
      return NextResponse.json({
        success: true,
        message: 'Asset already registered',
        registration: existingRegistration,
      })
    }

    // Register on Story Protocol
    const ipResponse = await StoryProtocolAssetService.registerAssetAsIP(
      asset,
      creatorWallet
    )

    // Attach default license terms (commercial use allowed, derivatives allowed with 10% royalty)
    const licenseAttached = await StoryProtocolAssetService.attachLicenseTerms(
      ipResponse.ipId,
      {
        commercialUse: true,
        commercialAttribution: true,
        derivatives: 'allowed',
        derivativeRoyalty: 10,
      }
    )

    // Save registration to database
    const registration = await prisma.assetStoryRegistration.create({
      data: {
        assetId,
        storyIpId: ipResponse.ipId,
        transactionHash: ipResponse.transactionHash,
        blockNumber: ipResponse.blockNumber,
        metadataUri: ipResponse.metadataUri,
        licenseTerms: {
          commercialUse: true,
          commercialAttribution: true,
          derivatives: 'allowed',
          derivativeRoyalty: 10,
        },
        status: 'registered',
        registeredAt: new Date(ipResponse.registeredAt),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Asset registered on Story Protocol',
      registration,
      ip: ipResponse,
    })
  } catch (error) {
    console.error('Asset registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register asset on Story Protocol' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/assets/[id]/register
 * 
 * Get Story Protocol registration status for an asset
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    const registration = await prisma.assetStoryRegistration.findUnique({
      where: { assetId },
    })

    if (!registration) {
      return NextResponse.json({
        success: true,
        registered: false,
        message: 'Asset not registered on Story Protocol',
      })
    }

    // Try to get details from Story Protocol
    const details = await StoryProtocolAssetService.getIPAssetDetails(
      registration.storyIpId
    )

    return NextResponse.json({
      success: true,
      registered: true,
      registration,
      details,
    })
  } catch (error) {
    console.error('Registration lookup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/assets/[id]/register
 * 
 * Unregister asset from Story Protocol (if needed)
 * Note: Story Protocol registrations are immutable; this removes WritArcade's tracking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      )
    }

    await prisma.assetStoryRegistration.delete({
      where: { assetId },
    })

    return NextResponse.json({
      success: true,
      message: 'Registration record deleted from WritArcade',
    })
  } catch (error) {
    console.error('Registration deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
