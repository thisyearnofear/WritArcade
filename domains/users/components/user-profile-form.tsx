'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface User {
    id: string
    preferredModel: string
    private: boolean
}

export function UserPreferencesForm({ user }: { user: User }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { toast } = useToast()

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        const data = {
            model: formData.get('model'),
            private: formData.get('private') === 'on',
        }

        try {
            const response = await fetch('/api/user/preferences', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error('Failed to update preferences')

            toast({
                title: 'Preferences updated',
                description: 'Your game generation settings have been saved.',
            })

            router.refresh()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update preferences. Please try again.',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="model">Preferred AI Model</Label>
                <Select name="model" defaultValue={user.preferredModel} disabled={isLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o (Balanced)</SelectItem>
                        <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Best Quality)</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                    This model will be used by default when generating new games.
                </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-700 p-4">
                <div className="space-y-0.5">
                    <Label className="text-base">Private Games</Label>
                    <p className="text-sm text-gray-400">
                        Hide your games from public discovery (only accessible via direct link)
                    </p>
                </div>
                <Switch
                    name="private"
                    defaultChecked={user.private}
                    disabled={isLoading}
                />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>

            <p className="text-xs text-gray-400 text-center">
                Your username and profile are managed by Farcaster
            </p>
        </form>
    )
}
