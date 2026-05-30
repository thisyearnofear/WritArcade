'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Loader2, ArrowLeftRight } from 'lucide-react'
import { chainForPaymentPath, getChainInfo } from '@/lib/chains'

export type PaymentPath = 'writercoin' | 'musd'

interface SimpleGameFormProps {
  onGenerate: (url: string) => void
  isGenerating: boolean
  /**
   * Which payment ecosystem the user expects to use. Drives the inline
   * "switch network" prompt and the URL placeholder hint. Defaults to
   * writer-coin (Base) — the curated arcade path.
   */
  paymentPath?: PaymentPath
}

export function SimpleGameForm({ onGenerate, isGenerating, paymentPath = 'musd' }: SimpleGameFormProps) {
  const [url, setUrl] = useState('')
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const targetChainId = chainForPaymentPath(paymentPath)
  const targetChain = getChainInfo(targetChainId)
  const isWrongChain = isConnected && chainId !== targetChainId
  const placeholder = paymentPath === 'musd'
    ? 'https://paragraph.xyz/... (any article)'
    : 'https://paragraph.xyz/... (supported writers)'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
          placeholder={placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12"
          required
        />
        <Button
          type="submit"
          disabled={isGenerating}
          className="h-12 px-6 font-bold uppercase tracking-widest"
          title="Start from this article"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>

      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg p-3"
        >
          <p>
            Paste an article first. Create a free Wordle without a wallet, or connect later when you are ready to generate a paid story game.
          </p>
        </motion.div>
      )}

      {isWrongChain && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2 text-sm bg-muted/50 border border-border rounded-lg p-3"
        >
          <p className="text-muted-foreground">
            {paymentPath === 'musd' ? 'MUSD' : 'Writer coins'} live on{' '}
            <span className="font-medium text-foreground">{targetChain.name}</span>.
          </p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: targetChainId })}
            disabled={isSwitching}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-foreground hover:text-foreground/80 disabled:opacity-50"
          >
            {isSwitching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            Switch
          </button>
        </motion.div>
      )}
    </div>
  )
}
