'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Gamepad2, Sparkles, Trophy, BarChart3, ExternalLink, FileText, Image as ImageIcon, Link2, Check, QrCode, Download, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { Game } from '../types'
import type { ChatEntry } from '../hooks/use-game-session'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { useToast } from '@/components/ui/use-toast'

interface PostGameCompletionProps {
  game: Game
  messages: ChatEntry[]
  userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
}

export function PostGameCompletion({ game, messages, userChoices }: PostGameCompletionProps) {
  const { toast } = useToast()
  const [playCount, setPlayCount] = useState<number | null>(null)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const copyWithFeedback = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(format)
      setTimeout(() => setCopiedFormat((prev) => (prev === format ? null : prev)), 2000)
    } catch {
      setCopiedFormat(null)
    }
  }

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    let skippedCount = 0

    try {
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas').then((m) => m.default),
      ])

      const element = document.getElementById('pdf-export-container')
      if (!element) throw new Error('PDF export container not found')

      const imageUrls = messages
        .filter((m) => m.role === 'assistant')
        .map((m) => m.narrativeImage)
        .filter((url): url is string => Boolean(url))

      // Pre-test images for CORS. A failed load means the host either blocks
      // cross-origin access or the image is unreachable.
      const preTestResults = await Promise.all(
        imageUrls.map((url) => {
          return new Promise<{ url: string; ok: boolean }>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve({ url, ok: true })
            img.onerror = () => resolve({ url, ok: false })
            img.src = url
          })
        })
      )

      const failedUrls = new Set(preTestResults.filter((r) => !r.ok).map((r) => r.url))

      // Try to recover CORS-blocked images through a same-origin proxy. If the
      // proxy also fails, hide the image so html2canvas doesn't taint the canvas.
      if (failedUrls.size > 0) {
        const proxyResults = await Promise.all(
          Array.from(failedUrls).map((url) => {
            return new Promise<{ url: string; ok: boolean }>((resolve) => {
              const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`
              const img = new Image()
              img.crossOrigin = 'anonymous'
              img.onload = () => resolve({ url, ok: true })
              img.onerror = () => resolve({ url, ok: false })
              img.src = proxyUrl
            })
          })
        )

        const proxyable = new Set(proxyResults.filter((r) => r.ok).map((r) => r.url))

        element.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
          const originalSrc = img.getAttribute('data-original-src') || img.src
          if (failedUrls.has(originalSrc)) {
            if (proxyable.has(originalSrc)) {
              img.src = `/api/image-proxy?url=${encodeURIComponent(originalSrc)}`
            } else {
              img.style.display = 'none'
              skippedCount++
            }
          }
        })
      }

      // Wait for the hidden container's images to settle after any src swaps.
      await new Promise<void>((resolve) => {
        const images = element.querySelectorAll<HTMLImageElement>('img')
        let pending = 0
        const check = () => {
          pending--
          if (pending <= 0) resolve()
        }
        images.forEach((img) => {
          if (img.complete) return
          pending++
          img.addEventListener('load', check, { once: true })
          img.addEventListener('error', check, { once: true })
        })
        if (pending === 0) resolve()
      })

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      const pageHeight = pdf.internal.pageSize.getHeight()

      let heightLeft = pdfHeight
      let position = 0

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${game.slug}-comic.pdf`)

      if (skippedCount > 0) {
        toast({
          title: 'Some images skipped',
          description: `${skippedCount} panel image(s) could not be captured and were omitted from the PDF.`,
          variant: 'default',
        })
      }
    } catch (err) {
      console.error('PDF export failed:', err)
      if (err instanceof DOMException && err.name === 'SecurityError') {
        toast({
          title: 'PDF export blocked',
          description: 'One or more panel images could not be captured securely. Try the Markdown export or reload and try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'PDF export failed',
          description: 'Could not generate the PDF. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      // Restore original image sources and display so future captures aren't affected.
      const element = document.getElementById('pdf-export-container')
      element?.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        const originalSrc = img.getAttribute('data-original-src')
        if (originalSrc) {
          img.src = originalSrc
        }
        img.style.display = ''
      })
      setPdfLoading(false)
    }
  }

  // Fetch play count for social proof
  useEffect(() => {
    fetch('/api/games/stats')
      .then(r => r.json())
      .then(d => {
        if (d.success) setPlayCount(d.data.publicGames)
      })
      .catch(() => {})
  }, [])

  const panelCount = messages.filter(m => m.role === 'assistant').length
  const totalChoices = userChoices.length

  const baseUrl =
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL) || `https://writersarcade.vercel.app`
  const gameUrl = `${baseUrl}/games/${game.slug}`

  const markdownStory = useMemo(() => {
    let md = `# ${game.title}\n\n_${game.description}_\n\n`
    messages.forEach((m) => {
      if (m.role === 'assistant') {
        md += `## ${m.id.startsWith('epilogue') ? 'Epilogue' : 'Scene'}\n${m.content}\n\n`
      }
    })
    if (userChoices.length > 0) {
      md += `## Your choices\n\n`
      userChoices.forEach((c, i) => {
        md += `${i + 1}. ${c.choice}\n`
      })
      md += '\n'
    }
    md += `Play at ${gameUrl}\n`
    return md
  }, [game.title, game.description, messages, userChoices, gameUrl])

  const lastChoice = userChoices[userChoices.length - 1]?.choice
  const truncatedChoice = lastChoice && lastChoice.length > 80 ? `${lastChoice.slice(0, 80)}…` : lastChoice
  const endingText = truncatedChoice
    ? `My story ended with: ${truncatedChoice}`
    : `I just finished "${game.title}" on WritersArcade`

  const shareData = useMemo(
    () => ({
      title: game.title,
      text: endingText,
      url: gameUrl,
      genre: game.genre,
      panelCount,
      gameTitle: game.title,
      author: game.authorParagraphUsername || undefined,
    }),
    [game.title, game.genre, game.authorParagraphUsername, endingText, gameUrl, panelCount]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto px-4 pb-16"
    >
      {/* Celebration header */}
      <div className="text-center space-y-4 mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25"
        >
          <Trophy className="w-8 h-8 text-white" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Story Complete
          </h2>
          <p className="text-muted-foreground text-sm">
            You finished &ldquo;{game.title}&rdquo; — a {game.genre} journey through {panelCount} panels
          </p>
        </div>
      </div>

      {/* Viral share card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">Share your ending</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {endingText}
            </p>
          </div>
          <ShareDropdown
            data={shareData}
            surface="post_game_completion"
            variant="default"
            size="default"
            buttonClassName="shrink-0 bg-white text-black hover:bg-white/90"
          />
        </div>
      </motion.div>

      {/* Export card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.4 }}
        className="rounded-2xl border border-white/10 bg-card p-5 mb-8"
      >
        <h3 className="text-sm font-bold text-white mb-3">Export your story</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => copyWithFeedback(markdownStory, 'markdown')}
            className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors"
          >
            {copiedFormat === 'markdown' ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
            {copiedFormat === 'markdown' ? 'Copied' : 'Markdown'}
          </button>
          <button
            onClick={() => copyWithFeedback(gameUrl, 'link')}
            className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors"
          >
            {copiedFormat === 'link' ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-muted-foreground" />}
            {copiedFormat === 'link' ? 'Copied' : 'Link'}
          </button>
          <button
            onClick={() => setShowQr((prev) => !prev)}
            className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors"
          >
            <QrCode className="w-4 h-4 text-muted-foreground" />
            {showQr ? 'Hide QR' : 'QR Code'}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Download className="w-4 h-4 text-muted-foreground" />}
            {pdfLoading ? 'Saving...' : 'PDF'}
          </button>
          <a
            href={game.imageUrl || gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-3 text-xs font-medium text-foreground hover:border-purple-500/30 hover:bg-purple-500/5 transition-colors ${!game.imageUrl ? 'pointer-events-none opacity-50' : ''}`}
          >
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            {game.imageUrl ? 'Image' : 'No Image'}
          </a>
        </div>
        {showQr && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-4"
          >
            <QRCodeSVG value={gameUrl} size={160} bgColor="transparent" fgColor="#ffffff" level="M" />
            <p className="text-xs text-muted-foreground text-center break-all max-w-[200px]">{gameUrl}</p>
          </motion.div>
        )}
      </motion.div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/generate"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3.5 text-sm font-bold text-white hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Make your own game
          </Link>
          <Link
            href="/my-games"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 px-5 py-3.5 text-sm font-bold text-purple-200 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all"
          >
            <Gamepad2 className="w-4 h-4" />
            My games
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {game.authorParagraphUsername && (
            <Link
              href={`/writers/${game.writerCoinId || ''}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              More from @{game.authorParagraphUsername}
            </Link>
          )}
          <Link
            href="/games"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Gamepad2 className="w-4 h-4" />
            Play another
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
      >
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{panelCount}</p>
          <p className="text-xs text-muted-foreground">Panels played</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <Gamepad2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{totalChoices}</p>
          <p className="text-xs text-muted-foreground">Choices made</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">
            {playCount !== null ? `${playCount}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Games created</p>
        </div>
      </motion.div>

      {/* Article context */}
      {game.articleUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <a
            href={game.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Read the original article <ExternalLink className="w-3 h-3" />
          </a>
        </motion.div>
      )}

      {/* Hidden PDF render target */}
      <div className="fixed -left-[9999px] top-0 -z-50 pointer-events-none" aria-hidden="true">
        <div id="pdf-export-container" className="w-[800px] bg-white text-black p-8">
          <h1 className="text-3xl font-bold text-black mb-2">{game.title}</h1>
          {game.description && (
            <p className="text-base text-gray-700 mb-8">{game.description}</p>
          )}
          <div className="space-y-8">
            {messages
              .filter((m) => m.role === 'assistant')
              .map((m, idx) => (
                <div key={m.id} className="break-inside-avoid">
                  <h3 className="text-lg font-bold text-black mb-3">
                    {m.id.startsWith('epilogue') ? 'Epilogue' : `Panel ${idx + 1}`}
                  </h3>
                  {m.narrativeImage && (
                    <img
                      src={m.narrativeImage}
                      data-original-src={m.narrativeImage}
                      alt=""
                      crossOrigin="anonymous"
                      className="w-full h-auto max-h-[320px] object-cover mb-3 block"
                    />
                  )}
                  <p className="text-base leading-relaxed text-black whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
          </div>
          {userChoices.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-black mb-3">Your choices</h3>
              <ul className="list-disc list-inside text-base text-black space-y-1">
                {userChoices.map((c, i) => (
                  <li key={i}>{c.choice}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
            Play at {gameUrl}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
