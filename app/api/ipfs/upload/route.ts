import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uploadToIPFS } from '@/domains/story/services/ipfs-utils'
import { checkRateLimit } from '@/services/rate-limit'

const uploadIpfsSchema = z.object({
  metadata: z.record(z.string(), z.unknown()),
})

export async function POST(request: NextRequest) {
  try {
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimit = checkRateLimit(identifier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryIn: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      )
    }

    const body = await request.json()
    const { metadata } = uploadIpfsSchema.parse(body)
    const uri = await uploadToIPFS(metadata)

    return NextResponse.json({
      success: true,
      uri,
    })
  } catch (error) {
    console.error('[IPFS Upload] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid IPFS upload payload',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload metadata',
      },
      { status: 500 }
    )
  }
}
