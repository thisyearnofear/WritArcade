/**
 * IP Registrations API
 * Fetches Story Protocol IP registrations for a user's assets
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const wallet = searchParams.get('wallet')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        if (!wallet) {
            return NextResponse.json(
                { success: false, error: 'Wallet address required' },
                { status: 400 }
            )
        }

        // Fetch assets with Story Protocol registrations for this user
        // We join Asset -> AssetStoryRegistration and filter by creatorId (wallet)
        const assets = await prisma.asset.findMany({
            where: {
                creatorId: wallet,
                storyRegistration: {
                    isNot: null
                }
            },
            include: {
                storyRegistration: true
            },
            orderBy: {
                storyRegistration: {
                    registeredAt: 'desc'
                }
            },
            take: limit,
            skip: offset
        })

        // Transform to IP registration format
        const registrations = assets
            .filter(asset => asset.storyRegistration)
            .map(asset => ({
                id: asset.storyRegistration!.id,
                assetId: asset.id,
                assetTitle: asset.title,
                assetType: asset.type,
                assetGenre: asset.genre,
                storyIpId: asset.storyRegistration!.storyIpId,
                transactionHash: asset.storyRegistration!.transactionHash,
                blockNumber: asset.storyRegistration!.blockNumber,
                metadataUri: asset.storyRegistration!.metadataUri,
                licenseTerms: asset.storyRegistration!.licenseTerms,
                status: asset.storyRegistration!.status,
                registeredAt: asset.storyRegistration!.registeredAt.toISOString(),
                createdAt: asset.storyRegistration!.createdAt.toISOString()
            }))

        // Get total count for pagination
        const total = await prisma.asset.count({
            where: {
                creatorId: wallet,
                storyRegistration: {
                    isNot: null
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                registrations,
                total,
                limit,
                offset
            }
        })
    } catch (error) {
        console.error('Failed to fetch IP registrations:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch IP registrations' },
            { status: 500 }
        )
    }
}