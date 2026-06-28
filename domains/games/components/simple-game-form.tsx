'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Loader2 } from 'lucide-react'

interface SimpleGameFormProps {
  onGenerate: (url: string) => void
  isGenerating: boolean
}

/**
 * Simplified entry form for the landing page.
 *
 * No wallet connection, no payment path toggle, no chain selectors.
 * Just a URL input and a submit button. All complexity lives on the
 * /generate page where users see it step by step.
 */
export function SimpleGameForm({ onGenerate, isGenerating }: SimpleGameFormProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onGenerate(url.trim())
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
        <Input
          type="url"
          placeholder="https://paragraph.xyz/... (paste any article)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12"
          required
        />
        <Button
          type="submit"
          disabled={isGenerating || !url.trim()}
          className="h-12 px-6 font-bold uppercase tracking-widest"
          title="Generate a game from this article"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        </Button>
      </form>

      {!url.trim() && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-muted-foreground text-center"
        >
          Paste a Paragraph article URL above. Generate a free word puzzle or a playable comic story.{' '}
          <span className="text-emerald-500 font-medium">No wallet needed to start.</span>
        </motion.p>
      )}
    </div>
  )
}
