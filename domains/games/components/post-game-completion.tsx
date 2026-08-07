'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Gamepad2, Sparkles, Trophy, BarChart3, ExternalLink, FileText, Image as ImageIcon, Link2, Check, QrCode, Download, Loader2, CalendarDays, ArrowUpRight } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { Game } from '../types'
import type { ChatEntry } from '../hooks/use-game-session'
import { ShareDropdown } from '@/components/ui/share-dropdown'
import { useToast } from '@/components/ui/use-toast'
import { SecretEpilogueFinaleCta } from '@/components/game/secret-epilogue-finale-cta'

interface PostGameCompletionProps {
  game: Game
  messages: ChatEntry[]
  userChoices: Array<{ panelIndex: number; choice: string; timestamp: string }>
  showEpilogueCta?: boolean
}

export function PostGameCompletion({ game, messages, userChoices, showEpilogueCta = true }: PostGameCompletionProps) {
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

    try {
      const response = await fetch(`/api/games/${game.slug}/pdf`)
      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${game.slug}-comic.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed:', err)
      toast({
        title: 'PDF export failed',
        description: 'Could not generate the PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
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
  const gameUrl = `${baseUrl}/games/${game.slug}?play=1`

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
    ? `I made a choice that changed "${game.title}": ${truncatedChoice}`
    : `I just finished "${game.title}" on WritersArcade`
  const referralText = `Play "${game.title}" and make your own choices — every run can end differently.`

  const shareData = useMemo(
    () => ({
      title: game.title,
      text: `${endingText} ${referralText}`,
      url: gameUrl,
      genre: game.genre,
      panelCount,
      gameTitle: game.title,
      author: game.authorParagraphUsername || undefined,
    }),
    [game.title, game.genre, game.authorParagraphUsername, endingText, referralText, gameUrl, panelCount]
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

      {/* Viral share card: the emotional payoff and social action come before
          ownership, export, or other optional paths. */}
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
            <p className="mt-2 text-xs font-medium text-purple-200/80">{referralText}</p>
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

      {/* Post-completion referral loop: keep the next action focused on bringing another player in. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.37, duration: 0.4 }}
        className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5"
      >
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white">Keep the loop going</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Come back tomorrow for a fresh Daily Challenge, or invite someone to play this story and compare endings.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/daily" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-amber-400">
                <CalendarDays className="h-3.5 w-3.5" />
Open Daily Challenge
              </Link>
              <Link href="/generate" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10">
                Make your own story <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {showEpilogueCta && (
        <SecretEpilogueFinaleCta game={game} nftMinted={Boolean(game.nftTokenId)} className="mb-8" />
      )}

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
            href="/games"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3.5 text-sm font-bold text-white hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Gamepad2 className="w-4 h-4" />
            Play another story
          </Link>
          <Link
            href="/generate"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 px-5 py-3.5 text-sm font-bold text-purple-200 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Create your own game
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

    </motion.div>
  )
}
