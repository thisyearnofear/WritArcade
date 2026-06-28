'use client'

import { useState, useEffect } from 'react'
import type { Game } from '../types'
import { WordleService, type WordleGuessResult, type WordleLetterState } from '../services/wordle.service'
import { shareGame } from '@/lib/farcaster-sharing.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWalletClient, useAccount } from 'wagmi'
import type { WalletClient, Transport, Chain, Account } from 'viem'

interface WordleGameInterfaceProps {
  game: Game
  maxAttempts?: number
}

export function WordleGameInterface({ game, maxAttempts }: WordleGameInterfaceProps) {
  const { data: walletClient } = useWalletClient()
  const { address: walletAddress } = useAccount()
  const [decryptedAnswer, setDecryptedAnswer] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState<string | null>(null)

  useEffect(() => {
    if (!decryptedAnswer && game.wordleAnswerVaultUuid && walletClient && walletAddress) {
      const decrypt = async () => {
        setIsDecrypting(true)
        try {
          const response = await fetch(`/api/games/${game.slug}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress }),
          })
          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Failed to authorize vault access')
          }

          if (data.status === 'ready_for_decryption') {
            // Lazy-load the CDR SDK (5.5 MB WASM + Emscripten loader) only when
            // we actually need to decrypt, so it doesn't bloat the initial bundle.
            const { createUserCdrClient, readVaultData } = await import('@/domains/story/services/cdr.service')
            const client = await createUserCdrClient(walletClient as unknown as WalletClient<Transport, Chain, Account>)
            if (!client) {
              throw new Error('CDR client unavailable')
            }
            const answer = await readVaultData(client, game.wordleAnswerVaultUuid!)
            if (!answer) {
              throw new Error('Failed to decrypt answer from vault')
            }
            setDecryptedAnswer(answer)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Decryption failed'
          console.error('Decryption failed:', msg)
          setDecryptError(msg)
        } finally {
          setIsDecrypting(false)
        }
      }
      decrypt()
    }
  }, [game, walletClient, walletAddress, decryptedAnswer])

  const normalizedAnswer = decryptedAnswer ? WordleService.normalize(decryptedAnswer) : ''
  const wordLength = normalizedAnswer.length
  const attemptsAllowed = maxAttempts ?? WordleService.DEFAULT_MAX_ATTEMPTS

  const [currentGuess, setCurrentGuess] = useState('')
  const [guesses, setGuesses] = useState<WordleGuessResult[]>([])
  const [status, setStatus] = useState<'in_progress' | 'won' | 'lost'>('in_progress')
  const [error, setError] = useState<string | null>(null)

  if (!game.wordleAnswerVaultUuid) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <p className="text-amber-400 font-medium">Answer Not Yet Available</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            This puzzle's answer will be vaulted via Story CDR after generation is complete.
          </p>
        </div>
      </div>
    )
  }

  if (decryptError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <p className="text-red-400">Failed to unlock game data</p>
          <p className="text-sm text-muted-foreground">{decryptError}</p>
        </div>
      </div>
    )
  }

  if (isDecrypting || !decryptedAnswer) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Decrypting secure game data from vault...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== 'in_progress') return

    const guess = currentGuess.trim()

    if (!WordleService.isValidGuess(guess, wordLength)) {
      setError(`Enter a ${wordLength}-letter word using only letters A-Z.`)
      return
    }

    try {
      const result = WordleService.evaluateGuess(normalizedAnswer, guess)
      const nextGuesses = [...guesses, result]
      setGuesses(nextGuesses)
      setCurrentGuess('')
      setError(null)

      const nextStatus = WordleService.deriveStatus(normalizedAnswer, nextGuesses, attemptsAllowed)
      setStatus(nextStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid guess'
      setError(message)
    }
  }

  const renderTile = (char: string | null, state: WordleLetterState | null, index: number, isNewGuess?: boolean) => {
    const baseClasses = 'w-10 h-10 md:w-12 md:h-12 border flex items-center justify-center text-lg md:text-2xl font-bold rounded-sm'
    let stateClasses = 'border-border bg-black text-white'

    if (state === 'correct') {
      stateClasses = 'bg-green-600 border-green-500 text-white'
    } else if (state === 'present') {
      stateClasses = 'bg-yellow-500 border-yellow-400 text-black'
    } else if (state === 'absent') {
      stateClasses = 'bg-muted border-border text-muted-foreground'
    }

    return (
      <div
        key={index}
        className={`${baseClasses} ${state ? stateClasses : 'border-border bg-black text-white'} ${isNewGuess ? 'animate-wordle-flip' : ''}`}
        style={isNewGuess ? { animationDelay: `${index * 80}ms` } : undefined}
      >
        {char?.toUpperCase()}
      </div>
    )
  }

  const rows = Array.from({ length: attemptsAllowed }, (_, rowIndex) => {
    const guess = guesses[rowIndex]?.guess ?? ''
    const letters = guesses[rowIndex]?.letters ?? []
    const isNewGuess = rowIndex === guesses.length - 1 && letters.length > 0

    return (
      <div key={rowIndex} className="flex gap-2 justify-center">
        {Array.from({ length: wordLength }, (_, colIndex) => {
          const char = guess[colIndex] ?? null
          const state = letters[colIndex] ?? null
          return renderTile(char, state as WordleLetterState | null, colIndex, isNewGuess)
        })}
      </div>
    )
  })

  const headingColor = game.primaryColor || '#fbbf24'

  const publication = game.publicationName || 'Unknown publication'
  const author = game.authorParagraphUsername || 'Unknown author'
  const publishedDate = game.articlePublishedAt
    ? new Date(game.articlePublishedAt).toLocaleDateString()
    : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 px-4 bg-black text-white">
      <div className="w-full max-w-xl space-y-6">
        <header className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold border"
              style={{ borderColor: headingColor, color: headingColor }}
            >
              Wordle • Article Puzzle
            </div>
            {game.wordleAnswerVaultUuid && (
              <span className="text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded-full border border-emerald-600/40 text-emerald-400 bg-emerald-950/40">
                Vaulted via CDR
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: headingColor }}>
            {game.title}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Guess the {wordLength}-letter word inspired by this article.
          </p>

          {/* Article context strip */}
          <div className="mt-2 rounded-lg bg-zinc-900/80 border border-zinc-700/70 px-3 py-2 text-left flex flex-col gap-1 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-zinc-300 truncate">
                <span className="text-zinc-400">From</span>{' '}
                <span className="font-medium text-zinc-100">{publication}</span>
                {author && (
                  <span className="text-zinc-400"> • by </span>
                )}
                {author && <span className="font-medium text-zinc-100">@{author}</span>}
                {publishedDate && (
                  <span className="text-zinc-500"> • {publishedDate}</span>
                )}
              </span>
              {game.articleUrl && (
                <a
                  href={game.articleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[11px] font-medium text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline"
                >
                  View article
                </a>
              )}
            </div>
          </div>
        </header>

        <main className="space-y-5">
          <div className="space-y-2">
            {rows}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value)}
                maxLength={wordLength}
                disabled={status !== 'in_progress'}
                className="bg-black border-border text-white uppercase tracking-[0.2em] text-center"
                placeholder={`${wordLength}-letter word`}
              />
              <Button
                type="submit"
                disabled={status !== 'in_progress'}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Guess
              </Button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </form>

          <section className="text-xs text-muted-foreground space-y-1">
            {status === 'in_progress' && (
              <p>
                {attemptsAllowed - guesses.length} guesses remaining.
              </p>
            )}
            {status === 'won' && (
              <div className="space-y-2">
                <p className="text-green-400 font-medium">
                  Correct! You solved this article Wordle in {guesses.length} guesses.
                </p>
                <Button
                  type="button"
                  onClick={() => shareGame(game)}
                  className="bg-sky-600 hover:bg-sky-700 text-xs"
                >
                  Share to Farcaster
                </Button>
              </div>
            )}
            {status === 'lost' && (
              <p className="text-red-400 font-medium">
                Out of guesses. The answer was <span className="font-mono uppercase">{normalizedAnswer}</span>.
              </p>
            )}
          </section>

          {/* About this puzzle */}
          <section className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                <span className="font-medium text-zinc-100">About this puzzle</span>
                <span className="text-[10px] text-zinc-500 group-open:hidden">tap to expand</span>
                <span className="text-[10px] text-zinc-500 hidden group-open:inline">tap to collapse</span>
              </summary>
              <div className="mt-2 space-y-1 text-[11px] leading-relaxed">
                <p>
                  This Wordle is generated from the vocabulary of the linked article.
                  Words that matter more in the article are more likely to appear as answers.
                </p>
                {game.articleUrl && (
                  <p>
                    For the full context, read the original article and then see how well you can
                    predict one of its key terms.
                  </p>
                )}
              </div>
            </details>
          </section>
        </main>
      </div>
    </div>
  )
}
