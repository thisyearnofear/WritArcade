/**
 * Story Protocol IP Registration API
 * Saves IP registration results to the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuth } from '@/services/auth'
import { checkRateLimit } from '@/services/rate-limit'
import { z } from 'zod'

const registerIpSchema = z.object({
  assetId: z.string(),
  storyIpId: z.string(),
  transactionHash: z.string(),
  metadataUri: z.string().optional(),
  licenseTerms: z.any().optional(),
  blockNumber: z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Get user for rate limit identifier
    const user = await optionalAuth()
    const identifier = user?.walletAddress || req.headers.get('x-forwarded-for') || 'anonymous'
    
    // Check rate limit
    const rateLimit = checkRateLimit(identifier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryIn: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      )
    }

    const body = await req.json()
    const validated = registerIpSchema.parse(body)
    
    const { 
      assetId, 
      storyIpId, 
      transactionHash, 
      metadataUri,
      licenseTerms,
      blockNumber 
    } = validated

    // Idempotency check - prevent duplicate registrations
    const existingRegistration = await prisma.assetStoryRegistration.findFirst({
      where: { transactionHash: transactionHash },
    });

    if (existingRegistration) {
      // Already registered - return existing record
      return NextResponse.json({
        success: true,
        data: {
          id: existingRegistration.id,
          storyIpId: existingRegistration.storyIpId,
          transactionHash: existingRegistration.transactionHash,
          idempotent: true,
        },
        message: 'Registration already saved',
      });
    }

    // Validate user is authenticated (reuse from rate limit check)
    if (!user?.walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the asset belongs to the user by checking creatorId matches walletAddress
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    })

    if (!asset || asset.creatorId?.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Asset not found or unauthorized' },
        { status: 403 }
      )
    }

    // Create or update the Story Protocol registration
    const registration = await prisma.assetStoryRegistration.upsert({
      where: { assetId },
      create: {
        assetId,
        storyIpId,
        transactionHash,
        metadataUri: metadataUri || '',
        blockNumber: blockNumber || 0,
        licenseTerms: licenseTerms || null,
        status: 'registered',
      },
      update: {
        storyIpId,
        transactionHash,
        metadataUri: metadataUri || '',
        blockNumber: blockNumber || 0,
        licenseTerms: licenseTerms || null,
        status: 'registered',
        registeredAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: registration.id,
        storyIpId: registration.storyIpId,
        transactionHash: registration.transactionHash,
      },
    })
  } catch (error) {
    console.error('Story Protocol registration API error:', error)
    return NextResponse.json(
      { error: 'Failed to save IP registration' },
      { status: 500 }
    )
  }
}

/**
 * Get IP registration status for an asset
 */
export async function GET(req: NextRequest) {
  try {
    const user = await optionalAuth()
    
    if (!user?.walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('assetId')

    if (!assetId) {
      return NextResponse.json(
        { error: 'Missing required parameter: assetId' },
        { status: 400 }
      )
    }

    const registration = await prisma.assetStoryRegistration.findUnique({
      where: { assetId },
    })

    if (!registration) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({
      data: {
        storyIpId: registration.storyIpId,
        transactionHash: registration.transactionHash,
        status: registration.status,
        registeredAt: registration.registeredAt,
      },
    })
  } catch (error) {
    console.error('Story Protocol registration API error:', error)
    return NextResponse.json(
      { error: 'Failed to get IP registration' },
      { status: 500 }
    )
  }
}