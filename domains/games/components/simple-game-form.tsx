'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Loader2, Wallet } from 'lucide-react'

interface SimpleGameFormProps {
  onGenerate: (url: string) => void
  isGenerating: boolean
}

export function SimpleGameForm({ onGenerate, isGenerating }: SimpleGameFormProps) {
  const [url, setUrl] = useState('')
  const { isConnected } = useAccount()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      // Show a clear message that wallet connection is required
      return
    }
    onGenerate(url)
  }

  return (
    <div className="space-y-3">
      <form 
        onSubmit={handleSubmit}
        className="flex gap-2 w-full max-w-xl"
      >
        <Input
          type="url"
          placeholder="https://paragraph.xyz/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12"
          required
          disabled={!isConnected}
        />
        <Button 
          type="submit" 
          disabled={isGenerating || !isConnected}
          className="h-12 px-6 font-bold uppercase tracking-widest"
          title={!isConnected ? 'Connect wallet to generate games' : 'Generate game'}
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>
      
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg p-3"
        >
          <Wallet className="w-4 h-4 flex-shrink-0" />
          <p>
            <span className="font-medium text-foreground">Connect your wallet</span> to generate games. Click the wallet icon in the header to get started.
          </p>
        </motion.div>
      )}
    </div>
  )
}
