import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verifyMagicLinkToken } from '@/services/magic-link'
import { getActor } from '@/services/auth'
import {
  GUEST_COOKIE_NAME,
  USER_COOKIE_NAME,
  signSubject,
  sessionCookieOptions,
} from '@/services/session'

/**
 * Magic-link landing: verifies the token, finds-or-creates the email user,
 * merges any current guest identity (games + credits survive), and sets the
 * signed user_session cookie.
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectParam = request.nextUrl.searchParams.get('redirect')
  const redirectPath = redirectParam?.startsWith('/') ? redirectParam : '/studio'

  try {
    const email = verifyMagicLinkToken(request.nextUrl.searchParams.get('token'))
    if (!email) {
      return NextResponse.redirect(new URL('/?auth_error=invalid_link', siteUrl))
    }

    const actor = await getActor()
    const existingEmailUser = await prisma.user.findUnique({ where: { email } })

    let user
    if (existingEmailUser) {
      if (actor?.identity === 'guest' && actor.user.id !== existingEmailUser.id) {
        // Merge the anonymous guest into the established email account.
        user = await prisma.$transaction(async (tx) => {
          await tx.game.updateMany({
            where: { userId: actor.user.id },
            data: { userId: existingEmailUser.id },
          })
          await tx.creditTransaction.updateMany({
            where: { userId: actor.user.id },
            data: { userId: existingEmailUser.id },
          })
          const merged = await tx.user.update({
            where: { id: existingEmailUser.id },
            data: {
              credits: { increment: actor.user.credits },
              totalCreditsPurchased: { increment: actor.user.totalCreditsPurchased },
            },
          })
          await tx.user.delete({ where: { id: actor.user.id } })
          return merged
        })
      } else {
        user = existingEmailUser
      }
    } else if (actor?.identity === 'guest' && !actor.user.email) {
      // Attach the email to the current guest row — no merge needed.
      user = await prisma.user.update({
        where: { id: actor.user.id },
        data: { email },
      })
    } else {
      user = await prisma.user.create({ data: { email } })
    }

    const response = NextResponse.redirect(new URL(`${redirectPath}?verified=1`, siteUrl))
    response.cookies.set(
      USER_COOKIE_NAME,
      signSubject({ kind: 'user', userId: user.id }),
      sessionCookieOptions()
    )
    response.cookies.delete(GUEST_COOKIE_NAME)
    return response
  } catch (error) {
    console.error('[Magic Link Verify] Error:', error)
    return NextResponse.redirect(new URL('/?auth_error=verify_failed', siteUrl))
  }
}
