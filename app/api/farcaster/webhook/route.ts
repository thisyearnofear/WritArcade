import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Farcaster Mini App Webhook Handler
 *
 * Receives events for:
 * - miniapp_added: User added your mini app
 * - miniapp_removed: User removed your mini app  
 * - notifications_enabled: User enabled notifications
 * - notifications_disabled: User disabled notifications
 *
 * Stores notification tokens per Farcaster fid so we can send push
 * notifications (e.g., new game from a writer you follow).
 *
 * Signature verification should be added in production:
 * See https://docs.farcaster.xyz/developers/miniapps/notifications
 */

interface WebhookHeader {
  fid: number
  timestamp?: number
}

interface NotificationDetails {
  url: string
  token: string
}

interface WebhookPayload {
  event: 'miniapp_added' | 'miniapp_removed' | 'notifications_enabled' | 'notifications_disabled'
  notificationDetails?: NotificationDetails
}

/**
 * Extract the Farcaster user's fid from the webhook header.
 * The header is a JSON object containing at minimum { fid: number }.
 */
function getFidFromHeader(header: unknown): number | null {
  if (!header || typeof header !== 'object') return null
  const h = header as Record<string, unknown>
  if (typeof h.fid === 'number' && Number.isInteger(h.fid) && h.fid > 0) {
    return h.fid
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const header = body.header as WebhookHeader | undefined
    const payload: string | undefined = body.payload

    if (!payload) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }

    // Decode base64url payload
    const decodedPayload: WebhookPayload = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8')
    )

    const fid = getFidFromHeader(header)
    if (!fid) {
      console.warn('[farcaster-webhook] No valid fid in header — skipping DB write')
      // Still return 200 — the event itself is valid, we just can't link it
      return NextResponse.json({ success: true, note: 'No fid in header, event acknowledged' })
    }

    console.log('[farcaster-webhook] Event:', decodedPayload.event, 'fid:', fid)

    switch (decodedPayload.event) {
      case 'miniapp_added':
      case 'notifications_enabled': {
        if (decodedPayload.notificationDetails) {
          const { token, url } = decodedPayload.notificationDetails
          await prisma.farcasterNotificationToken.upsert({
            where: { fid_token: { fid, token } },
            create: { fid, token, url, enabled: true },
            update: { url, enabled: true, updatedAt: new Date() },
          })
          console.log('[farcaster-webhook] Token saved/updated for fid:', fid)
        }
        break
      }

      case 'miniapp_removed': {
        // Remove all tokens for this fid — user removed the mini app entirely
        const { count } = await prisma.farcasterNotificationToken.updateMany({
          where: { fid, enabled: true },
          data: { enabled: false, updatedAt: new Date() },
        })
        console.log('[farcaster-webhook] Disabled', count, 'tokens for fid:', fid)
        break
      }

      case 'notifications_disabled': {
        // Soft-disable all tokens for this fid
        const { count } = await prisma.farcasterNotificationToken.updateMany({
          where: { fid, enabled: true },
          data: { enabled: false, updatedAt: new Date() },
        })
        console.log('[farcaster-webhook] Disabled', count, 'tokens for fid:', fid)
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[farcaster-webhook] Error:', error)
    // Always return 200 to prevent Farcaster from retrying
    return NextResponse.json(
      { error: 'Webhook processing failed, event acknowledged' },
      { status: 200 }
    )
  }
}
