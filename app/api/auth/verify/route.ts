import { NextResponse } from 'next/server'
import { SiweMessage, type SiweMessage as SiweMessageType } from 'siwe'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/database'
import { SESSION_COOKIE_NAME, GUEST_COOKIE_NAME, USER_COOKIE_NAME, sessionCookieOptions, signSessionValue } from '@/services/session'
import { getActor } from '@/services/auth'

export async function POST(req: Request) {
    let message: string | SiweMessageType | undefined;
    let signature: string;

    try {
        const body = await req.json();
        message = body.message;
        signature = body.signature;

        const cookieStore = await cookies()
        const nonce = cookieStore.get('siwe-nonce')?.value

        if (!nonce) {
            console.error('SIWE Verification: Nonce cookie missing')
            return NextResponse.json({ error: 'Nonce not found' }, { status: 422 })
        }

        const SIWEObject = new SiweMessage(message as string)

        // Enforce that the signed message belongs to OUR domain. The request host
        // is authoritative for requests to this deployment; falling back to the
        // configured public site host keeps preview/local deploys working.
        const host = req.headers.get('host')
        const siteHost =
          (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
        const expectedDomain = (host || siteHost || 'writersarcade.vercel.app').toLowerCase()

        const { data: fields } = await SIWEObject.verify({
            signature,
            nonce,
            // Never skip domain enforcement: a message signed for any other
            // origin (phishing) must be rejected.
            domain: expectedDomain,
        })

        // Check if the nonce matches (already checked by verify, but double check logic if needed)
        if (fields.nonce !== nonce) {
            console.error(`SIWE Verification: Nonce mismatch. Cookie: ${nonce}, Message: ${fields.nonce}`)
            return NextResponse.json({ error: 'Invalid nonce' }, { status: 422 })
        }

        // User is authenticated!
        const walletAddress = fields.address

        // Adopt or merge any current guest/email identity so games and
        // credits survive the upgrade to a wallet account.
        const actor = await getActor()
        let user
        if (actor && !actor.user.walletAddress) {
            const existingWalletUser = await prisma.user.findUnique({ where: { walletAddress } })
            if (!existingWalletUser) {
                user = await prisma.user.update({
                    where: { id: actor.user.id },
                    data: { walletAddress },
                })
            } else {
                user = await prisma.$transaction(async (tx) => {
                    await tx.game.updateMany({
                        where: { userId: actor.user.id },
                        data: { userId: existingWalletUser.id },
                    })
                    await tx.creditTransaction.updateMany({
                        where: { userId: actor.user.id },
                        data: { userId: existingWalletUser.id },
                    })
                    const merged = await tx.user.update({
                        where: { id: existingWalletUser.id },
                        data: {
                            credits: { increment: actor.user.credits },
                            totalCreditsPurchased: { increment: actor.user.totalCreditsPurchased },
                            email: existingWalletUser.email ?? actor.user.email,
                        },
                    })
                    await tx.user.delete({ where: { id: actor.user.id } })
                    return merged
                })
            }
        } else {
            user = await prisma.user.upsert({
                where: { walletAddress },
                update: { updatedAt: new Date() },
                create: {
                    walletAddress,
                    preferredModel: 'gpt-4o-mini',
                },
            })
        }

        // Create session
        const response = NextResponse.json({ success: true, user })

        // Set the app's main session cookie (HMAC-signed so it can't be forged)
        response.cookies.set(SESSION_COOKIE_NAME, signSessionValue(walletAddress), sessionCookieOptions())

        // Wallet session supersedes guest/email sessions
        response.cookies.delete(GUEST_COOKIE_NAME)
        response.cookies.delete(USER_COOKIE_NAME)

        // Clear nonce
        response.cookies.delete('siwe-nonce')

        return response

    } catch (error: unknown) {
        console.error('SIWE verification failed:', error)
        console.error('Error content:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
        });

        if (message) {
            console.error('Failed message content:', JSON.stringify(message, null, 2))
        }

        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Invalid signature' },
            { status: 401 }
        )
    }
}
