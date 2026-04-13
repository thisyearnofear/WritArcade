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

export function SimpleGameForm({ onGenerate, isGenerating }: SimpleGameFormProps) {
  const [url, setUrl] = useState('')

  return (
    <form 
      onSubmit={(e) => { e.preventDefault(); onGenerate(url); }}
      className="flex gap-2 w-full max-w-xl"
    >
      <Input
        type="url"
        placeholder="https://paragraph.xyz/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-12"
        required
      />
      <Button 
        type="submit" 
        disabled={isGenerating}
        className="h-12 px-6 font-bold uppercase tracking-widest"
      >
        {isGenerating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
      </Button>
    </form>
  )
}
