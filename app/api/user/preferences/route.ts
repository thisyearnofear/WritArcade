import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const preferencesSchema = z.object({
    model: z.string().optional(),
    private: z.boolean().optional(),
})

export async function PATCH(req: Request) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
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

        return NextResponse.json({ success: true, user: updatedUser })
    } catch (error) {
        console.error('Preferences update error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update preferences' },
            { status: 500 }
        )
    }
}
