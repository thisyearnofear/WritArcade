'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Game } from '../types'
import {
    Loader2,
    DollarSign,
    Eye,
    EyeOff,
    Settings,
    Star
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { isAdmin } from '@/lib/constants'

interface GameSettingsModalProps {
    game: Game | null
    isOpen: boolean
    onClose: () => void
    onUpdate: (slug: string, data: { playFee?: string; private?: boolean; featured?: boolean }) => Promise<void>
}

export function GameSettingsModal({
    game,
    isOpen,
    onClose,
    onUpdate,
}: GameSettingsModalProps) {
    const { address } = useAccount()
    const [playFee, setPlayFee] = useState(game?.playFee || '')
    const [isPrivate, setIsPrivate] = useState(game?.private || false)
    const [isFeatured, setIsFeatured] = useState(game?.featured || false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSave = async () => {
        if (!game) return
        setIsLoading(true)
        try {
            await onUpdate(game.slug, {
                playFee: playFee.toString(),
                private: isPrivate,
                featured: isFeatured,
            })
            onClose()
        } catch (error) {
            console.error('Failed to update game settings', error)
        } finally {
            setIsLoading(false)
        }
    }

    const userIsAdmin = isAdmin(address)

    const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayFee(e.target.value)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-card text-white border-purple-500/30">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-purple-400" />
                        Game Settings
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Configure visibility and monetization for "{game?.title}".
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Play Fee Section */}
                    <div className="grid gap-2">
                        <Label htmlFor="playFee" className="flex items-center gap-2 text-foreground">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            Play Fee ($DONUT)
                        </Label>
                        <div className="relative">
                            <Input
                                id="playFee"
                                type="number"
                                value={playFee}
                                onChange={handleFeeChange}
                                placeholder="0.00"
                                className="bg-muted border-border text-white pl-8 focus:border-purple-500"
                                step="0.1"
                                min="0"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Set a fee in $DONUT tokens. 80% goes to you, 10% to original author.
                            Leave 0 for free to play.
                        </p>
                    </div>

                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg border-border bg-muted/50">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="visibility" className="flex items-center gap-2 font-medium">
                                {isPrivate ? <EyeOff className="w-4 h-4 text-red-400" /> : <Eye className="w-4 h-4 text-blue-400" />}
                                {isPrivate ? 'Private' : 'Public'}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                {isPrivate
                                    ? 'Only visible to you via direct link.'
                                    : 'Visible in the arcade and search.'}
                            </span>
                        </div>
                        <Switch
                            id="visibility"
                            checked={!isPrivate}
                            onCheckedChange={(checked) => setIsPrivate(!checked)}
                            className="data-[state=checked]:bg-purple-600"
                        />
                    </div>

                    {/* Featured Toggle (Admin Only) */}
                    {userIsAdmin && (
                        <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg border-yellow-500/30 bg-yellow-950/10">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="featured" className="flex items-center gap-2 font-medium text-yellow-400">
                                    <Star className="w-4 h-4 fill-current" />
                                    Featured
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    Promote this game to the homepage.
                                </span>
                            </div>
                            <Switch
                                id="featured"
                                checked={isFeatured}
                                onCheckedChange={setIsFeatured}
                                className="data-[state=checked]:bg-yellow-500"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="border-border hover:bg-muted hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
