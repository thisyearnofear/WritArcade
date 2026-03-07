import { NextRequest, NextResponse } from 'next/server'
import { GameDatabaseService } from '@/domains/games/services/game-database.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const asset = await GameDatabaseService.getAssetPack(id)

    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset pack not found' }, { status: 404 })
    }

    // Story Protocol IP metadata format — returned when ?ipMetadata=true
    // The indexer expects a flat JSON with name, description, image, attributes
    const { searchParams } = new URL(request.url)
    if (searchParams.get('ipMetadata') === 'true') {
      return NextResponse.json({
        name: asset.title,
        description: asset.description || '',
        image: '',
        attributes: [
          { trait_type: 'type', value: asset.type },
          { trait_type: 'genre', value: asset.genre || '' },
          { trait_type: 'source', value: asset.articleUrl || '' },
        ],
      })
    }

    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    console.error('Fetch asset error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch asset pack' }, { status: 500 })
  }
}
