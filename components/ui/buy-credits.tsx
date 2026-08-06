'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Coins, Loader2, Plus, ExternalLink, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { CREDITS_CONFIG } from '@/lib/writerCoins'

interface CreditsData {
  credits: number
  totalPurchased: number
}

const FIAT_AMOUNTS = [500, 1000, 2500, 5000]
const CREDITS_PER_DOLLAR = 10

export function BuyCreditsButton() {
  const { address, isConnected } = useAccount()
  const [credits, setCredits] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(1000)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsEmail, setNeedsEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    setLoading(true)
    // Wallet users are keyed by address; guests/email users by session cookie.
    const query = address ? `?wallet=${encodeURIComponent(address)}` : ''
    fetch(`/api/ramp/credits${query}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setCredits(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  const handleBuyCredits = async () => {
    setQuoteLoading(true)
    setError(null)
    try {
      const quoteRes = await fetch('/api/ramp/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiatAmount: selectedAmount }),
      })
      const quoteData = await quoteRes.json()
      if (!quoteData.success) throw new Error(quoteData.error)

      const orderRes = await fetch('/api/ramp/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quoteData.data.quoteId,
          fiatAmount: selectedAmount,
        }),
      })
      const orderData = await orderRes.json()
      if (orderRes.status === 409 && orderData.code === 'EMAIL_REQUIRED') {
        setNeedsEmail(true)
        return
      }
      if (!orderData.success) throw new Error(orderData.error)

      if (orderData.data.widgetUrl) {
        setWidgetUrl(orderData.data.widgetUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setQuoteLoading(false)
    }
  }

  const handleSendMagicLink = async () => {
    setQuoteLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect: typeof window !== 'undefined' ? window.location.pathname : '/studio',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to send link')
      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send link')
    } finally {
      setQuoteLoading(false)
    }
  }

  // Show for wallet users and for no-wallet actors with a credit balance
  // (guests/email users from the studio flow). Fresh anonymous visitors with
  // no session see nothing until they generate their first game.
  if (!isConnected && credits === null) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 hover:border-emerald-400/40"
      >
        <Coins className="w-3.5 h-3.5" />
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <span>{credits?.credits ?? 0}</span>
        )}
        <Plus className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            >
              {widgetUrl ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <ExternalLink className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Complete your purchase</h2>
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to Etherfuse to complete the onramp.
                  </p>
                  <a
                    href={widgetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Continue to Etherfuse <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => { setShowModal(false); setWidgetUrl(null) }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
              ) : needsEmail ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Add your email first</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your credits need a home that survives cleared cookies.
                      We'll send you a sign-in link — no password, no wallet.
                    </p>
                  </div>
                  {emailSent ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-foreground">
                      Check your inbox — click the link, then come back and buy credits.
                    </div>
                  ) : (
                    <>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      {error && <p className="text-xs text-red-400">{error}</p>}
                      <Button
                        onClick={handleSendMagicLink}
                        disabled={quoteLoading || !email.includes('@')}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                        size="lg"
                      >
                        {quoteLoading ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                        ) : (
                          'Send sign-in link'
                        )}
                      </Button>
                    </>
                  )}
                  <button
                    onClick={() => { setNeedsEmail(false); setEmailSent(false); setError(null) }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Buy Credits</h2>
                      <p className="text-sm text-muted-foreground">
                        {credits !== null && `${credits.credits} credits available`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Ban className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {FIAT_AMOUNTS.map(amount => {
                      const creditsAmount = (amount / 100) * CREDITS_PER_DOLLAR
                      return (
                        <button
                          key={amount}
                          onClick={() => setSelectedAmount(amount)}
                          className={cn(
                            'rounded-lg border p-4 text-left transition',
                            selectedAmount === amount
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-border bg-muted/50 hover:border-muted-foreground/30'
                          )}
                        >
                          <div className="text-lg font-bold text-foreground">${(amount / 100).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground mt-1">{creditsAmount} credits</div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Credits</span>
                      <span className="font-semibold text-foreground">
                        {(selectedAmount / 100) * CREDITS_PER_DOLLAR}
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Rate</span>
                      <span className="font-semibold text-foreground">{CREDITS_PER_DOLLAR} credits / $1</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">What credits unlock</p>
                    <div className="flex justify-between">
                      <span>Generate a game</span>
                      <span className="font-semibold text-foreground">{CREDITS_CONFIG.cost['generate-game']}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Mint an NFT</span>
                      <span className="font-semibold text-foreground">{CREDITS_CONFIG.cost['mint-nft']}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Animate a finished comic</span>
                      <span className="font-semibold text-foreground">{CREDITS_CONFIG.cost['video-upsell']}</span>
                    </div>
                  </div>

                  {error && (
                    <p className="mt-3 text-xs text-red-400">{error}</p>
                  )}

                  <Button
                    onClick={handleBuyCredits}
                    disabled={quoteLoading}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                    size="lg"
                  >
                    {quoteLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    ) : (
                      <><Coins className="h-4 w-4" /> Buy ${(selectedAmount / 100).toFixed(2)} worth</>
                    )}
                  </Button>

                  <p className="mt-3 text-center text-[10px] text-muted-foreground">
                    Powered by Etherfuse — fiat to crypto onramp on Base
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
