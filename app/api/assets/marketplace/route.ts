import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || undefined
        const search = searchParams.get('search') || undefined
        const genre = searchParams.get('genre') || undefined
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

        const result = await GameDatabaseService.getMarketplaceAssets({
            type,
            genre,
            search,
            limit,
            offset,
        })

        return NextResponse.json({ success: true, data: result })
    } catch (error) {
        console.error('Marketplace fetch error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch marketplace assets' }, { status: 500 })
    }
}
