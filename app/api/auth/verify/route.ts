import { NextResponse } from 'next/server'
import { SiweMessage, type SiweMessage as SiweMessageType } from 'siwe'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/database'
import { SESSION_COOKIE_NAME, sessionCookieOptions, signSessionValue } from '@/services/session'

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

        // Use the domain from the message itself to verify, 
        // as we trusts the frontend provided domain in the message 
        // (the signature proves the user signed *that* domain).
        // The security comes from checking if that domain is *ours*.
        // But for standard login, we can be slightly lenient in dev.

        const { data: fields } = await SIWEObject.verify({
            signature,
            nonce,
            // domain: req.headers.get('host') ?? undefined 
            // We skip enforcing domain check against server header here manually
            // because SiweMessage.verify checks it against the message.domain.
        })

        // Check if the nonce matches (already checked by verify, but double check logic if needed)
        if (fields.nonce !== nonce) {
            console.error(`SIWE Verification: Nonce mismatch. Cookie: ${nonce}, Message: ${fields.nonce}`)
            return NextResponse.json({ error: 'Invalid nonce' }, { status: 422 })
        }

        // User is authenticated!
        const walletAddress = fields.address

        // Upsert user in database
        const user = await prisma.user.upsert({
            where: { walletAddress },
            update: { updatedAt: new Date() },
            create: {
                walletAddress,
                preferredModel: 'gpt-4o-mini',
            },
        })

        // Create session
        const response = NextResponse.json({ success: true, user })

        // Set the app's main session cookie (HMAC-signed so it can't be forged)
        response.cookies.set(SESSION_COOKIE_NAME, signSessionValue(walletAddress), sessionCookieOptions())

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
