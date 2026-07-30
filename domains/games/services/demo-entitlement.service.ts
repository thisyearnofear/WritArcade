import { prisma } from '@/lib/database'
import { checkRateLimit } from '@/services/rate-limit'

export const FREE_DEMO_OWNERSHIP_SOURCE = 'free_demo'

/**
 * One free story game per identity for the no-wallet tier.
 * DB-backed count (serverless-safe); the in-memory rate limiter is
 * burst protection only.
 */
export class DemoEntitlementService {
  static async canGenerateFreeGame(userId: string): Promise<boolean> {
    const used = await prisma.game.count({
      where: { userId, ownershipSource: FREE_DEMO_OWNERSHIP_SOURCE },
    })
    return used === 0
  }

  /** Burst protection keyed on identity + IP. Returns false when throttled. */
  static checkBurstLimit(userId: string, ip: string | null): boolean {
    const byUser = checkRateLimit(`demo:${userId}`)
    if (!byUser.allowed) return false
    if (ip) {
      const byIp = checkRateLimit(`demo-ip:${ip}`)
      if (!byIp.allowed) return false
    }
    return true
  }
}
