'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface EmbedSnippetProps {
  slug: string
}

export function EmbedSnippet({ slug }: EmbedSnippetProps) {
  const [copied, setCopied] = useState(false)

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://writersarcade.vercel.app')

  const snippet = `<iframe
  src="${siteUrl}/embed/${slug}?ref=YOUR_CAMPAIGN"
  width="100%"
  height="640"
  style="border:0;border-radius:12px;overflow:hidden"
  title="Interactive story — WritersArcade"
  loading="lazy"
></iframe>`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — user can select the text manually
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Embed this story
        </p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        onClick={handleCopy}
        title="Click to copy"
        className="overflow-x-auto rounded-lg bg-black/60 p-3 text-xs leading-relaxed text-white/70 cursor-pointer transition-colors hover:bg-black/50"
      >
        <code>{snippet}</code>
      </pre>
      <p className="mt-2 text-xs text-muted-foreground">
        Replace <code className="text-white/70">YOUR_CAMPAIGN</code> to see which placement drives plays in your insights.
      </p>
    </div>
  )
}
