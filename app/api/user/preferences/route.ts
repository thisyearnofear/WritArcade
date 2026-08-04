import { prisma } from '@/lib/database'
import { getCurrentUser } from '@/services/auth'
import { ok, unauthorized, fail } from '@/lib/api-response'
import { z } from 'zod'

const preferencesSchema = z.object({
    model: z.string().optional(),
    private: z.boolean().optional(),
})

export async function PATCH(req: Request) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return unauthorized()
        }

        const body = await req.json()
        const data = preferencesSchema.parse(body)

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                preferredModel: data.model,
                private: data.private,
            },
        })

        return ok({ user: updatedUser })
    } catch (error) {
        console.error('Preferences update error:', error)
        return fail('Failed to update preferences', 500)
    }
}
