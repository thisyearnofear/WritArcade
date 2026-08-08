'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Lock, Unlock, Eye, Loader2, ShieldCheck, Copy, Check, Share2 } from 'lucide-react'
import { useWalletClient } from 'wagmi'
import type { WalletClient, Transport, Chain, Account } from 'viem'

type UnlockStep = 'idle' | 'authorizing' | 'loading_sdk' | 'requesting_decrypt' | 'done'

const STEP_LABEL: Record<UnlockStep, string> = {
  idle: '',
  authorizing: 'Verifying completion + NFT ownership…',
  loading_sdk: 'Loading Inco SDK…',
  requesting_decrypt: 'Requesting attested decrypt via Inco…',
  done: 'Decrypted via Inco confidential compute',
}

const UNLOCKED_VAULTS_KEY = 'writersarcade.unlockedVaults'

interface SecretPanelProps {
  gameId: string
  gameSlug: string
  primaryColor: string
  promptVaultUuid?: string | null
  isConnected: boolean
  walletAddress?: string
  nftTokenId?: string | null
  storySessionId?: string | null
  storyComplete?: boolean
}

interface AccessPolicy {
  encryption?: string
  cdrReadCondition?: string
  nftContract: string
  nftTokenId: string
  nftChainId: number
  completedPanels: number
}

export function SecretPanel({
  gameSlug,
  primaryColor,
  promptVaultUuid,
  isConnected,
  walletAddress,
  nftTokenId,
  storySessionId,
  storyComplete = false,
}: SecretPanelProps) {
  const { data: walletClient } = useWalletClient()
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlockStep, setUnlockStep] = useState<UnlockStep>('idle')
  const [unlocked, setUnlocked] = useState(false)
  const [panelData, setPanelData] = useState<{ narrative: string, imageUrl?: string } | null>(null)
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/games/${gameSlug}?unlocked=${encodeURIComponent(gameSlug)}`
    : ''

  const copyToClipboard = useCallback(async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      /* ignore clipboard errors */
    }
  }, [])

  const recordUnlockedVault = useCallback((policy: AccessPolicy | null) => {
    if (typeof window === 'undefined' || !promptVaultUuid) return

    const record = {
      gameSlug,
      vaultUuid: promptVaultUuid,
      nftContract: policy?.nftContract ?? null,
      nftTokenId: policy?.nftTokenId ?? nftTokenId ?? null,
      nftChainId: policy?.nftChainId ?? null,
      walletAddress: walletAddress ?? null,
      unlockedAt: new Date().toISOString(),
      shareUrl,
    }

    try {
      const existing = JSON.parse(window.localStorage.getItem(UNLOCKED_VAULTS_KEY) || '[]')
      const records = Array.isArray(existing) ? existing : []
      const next = [
        record,
        ...records.filter((item: { gameSlug?: string; vaultUuid?: string }) => (
          item.gameSlug !== gameSlug || item.vaultUuid !== promptVaultUuid
        )),
      ].slice(0, 50)
      window.localStorage.setItem(UNLOCKED_VAULTS_KEY, JSON.stringify(next))
    } catch {
      window.localStorage.setItem(UNLOCKED_VAULTS_KEY, JSON.stringify([record]))
    }
  }, [gameSlug, nftTokenId, promptVaultUuid, shareUrl, walletAddress])

  const handleUnlock = useCallback(async () => {
    if (!isConnected || !walletAddress || !walletClient || !promptVaultUuid) {
      setError('Wallet or vault configuration missing')
      return
    }

    if (!storyComplete || !storySessionId) {
      setError('Finish all 5 story panels before unlocking the secret panel.')
      return
    }

    setIsUnlocking(true)
    setError(null)
    setUnlockStep('authorizing')

    try {
      const response = await fetch(`/api/games/${gameSlug}/secret-panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, sessionId: storySessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock secret panel')
      }

      // Inco path: attested decrypt via @inco/lightning-js (no WASM)
      const handles = data.incoHandles?.length
        ? data.incoHandles
        : data.incoHandle
          ? [data.incoHandle]
          : null

      if (!handles || handles.length === 0) {
        throw new Error('No decryption handle returned')
      }

      setUnlockStep('loading_sdk')
      const { decryptSecretPanel, formatHandle } = await import('@/lib/daily-challenge/inco')

      setUnlockStep('requesting_decrypt')
      const decrypted = await decryptSecretPanel(
        handles.map((handle: string) => formatHandle(handle)),
        walletClient as unknown as WalletClient<Transport, Chain, Account>
      )
      if (!decrypted) {
        throw new Error('Failed to decrypt via Inco')
      }

      const panel = JSON.parse(decrypted)
      setPanelData(panel)
      setAccessPolicy(data.accessPolicy ?? null)
      setUnlocked(true)
      recordUnlockedVault(data.accessPolicy ?? null)
      setUnlockStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed')
      setUnlockStep('idle')
    } finally {
      setIsUnlocking(false)
    }
  }, [isConnected, walletAddress, walletClient, gameSlug, promptVaultUuid, storyComplete, storySessionId, recordUnlockedVault])

  return (
    <motion.div
      id="secret-epilogue"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      {/* Panel label */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded"
          style={{
            backgroundColor: `${primaryColor}20`,
            color: primaryColor,
          }}
        >
          SECRET EPILOGUE
        </span>
        {unlocked ? (
          <Eye className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        ) : (
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {promptVaultUuid && (
          <span className="ml-auto text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded-full border border-emerald-600/40 text-emerald-400 bg-emerald-950/40">
            Encrypted via Inco
          </span>
        )}
      </div>

      {/* Panel container */}
      <div
        className="relative overflow-hidden rounded-lg border-2"
        style={{
          borderColor: unlocked ? primaryColor : '#374151',
          backgroundColor: unlocked ? '#111827' : '#0a0a0a',
        }}
      >
        <AnimatePresence mode="wait">
          {unlocked && panelData ? (
            /* UNLOCKED STATE */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {panelData.imageUrl && (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={panelData.imageUrl}
                    alt="Secret panel illustration"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                </div>
              )}

              <div className="p-5">
                <p className="text-foreground text-base leading-relaxed font-medium italic">
                  &ldquo;{panelData.narrative}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Unlock className="w-3 h-3" />
                  <span>Secret epilogue unlocked</span>
                </div>
                {(accessPolicy || promptVaultUuid) && (
                  <details className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-left">
                    <summary className="cursor-pointer text-xs font-semibold text-foreground list-none">
                      Share & verify unlock
                    </summary>
                    {accessPolicy && (
                      <div className="mt-3 grid gap-2 rounded-md border border-emerald-500/20 bg-emerald-950/20 p-3 text-[11px] text-emerald-100">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Access verified on-chain</span>
                        </div>

                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-emerald-200/80">
                          <dt className="text-emerald-300/60">Gate NFT</dt>
                          <dd className="font-mono flex items-center gap-1">
                            <span>#{accessPolicy.nftTokenId} on Base</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(accessPolicy.nftContract, 'nft')}
                              className="text-emerald-300/60 hover:text-emerald-200"
                              aria-label="Copy NFT contract address"
                            >
                              {copiedField === 'nft' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </dd>

                          <dt className="text-emerald-300/60">Panels completed</dt>
                          <dd className="font-mono">{accessPolicy.completedPanels} / 5</dd>

                          {promptVaultUuid && (
                            <>
                              <dt className="text-emerald-300/60">On-chain ref</dt>
                              <dd className="font-mono flex items-center gap-1 break-all">
                                <span>{promptVaultUuid.length > 14 ? `${promptVaultUuid.slice(0, 8)}…${promptVaultUuid.slice(-4)}` : promptVaultUuid}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(promptVaultUuid, 'uuid')}
                                  className="text-emerald-300/60 hover:text-emerald-200"
                                  aria-label="Copy on-chain reference"
                                >
                                  {copiedField === 'uuid' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </dd>
                            </>
                          )}
                        </dl>
                      </div>
                    )}
                    {promptVaultUuid && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(shareUrl, 'share')}
                          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10"
                        >
                          {copiedField === 'share' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy deep link
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const text = `I unlocked the secret epilogue for ${gameSlug}: ${shareUrl}`
                            if (navigator.share) {
                              navigator.share({ title: 'Secret epilogue unlocked', text, url: shareUrl }).catch(() => {})
                            } else {
                              copyToClipboard(text, 'share-text')
                            }
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-black hover:bg-emerald-400"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Share unlock
                        </button>
                      </div>
                    )}
                  </details>
                )}
              </div>
            </motion.div>
          ) : (
            /* LOCKED STATE */
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="p-8 text-center"
            >
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ zIndex: 2 }}
                >
                  <div className="bg-muted/80 backdrop-blur-sm rounded-full p-4">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="h-24 opacity-10 blur-xl bg-gradient-to-r from-transparent via-muted-foreground to-transparent" />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2">
                Secret epilogue locked
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Finish the story and mint the game NFT to reveal a hidden epilogue stored on-chain.
              </p>

              {/* Inco encryption indicator */}
              {promptVaultUuid && (
                <div className="mb-5 mx-auto max-w-md rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-left">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="font-semibold">Encrypted on-chain</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-emerald-200/80">
                    Only the NFT holder can decrypt this epilogue after completing all 5 panels.
                  </p>
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-emerald-400/80 hover:text-emerald-300 list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">▸</span>
                      How it works (Inco)
                    </summary>
                    <div className="mt-2 text-[10px] leading-relaxed text-emerald-200/70 space-y-1.5">
                      <p>
                        Content is encrypted as an on-chain handle on Base. Access is tied to NFT ownership and enforced by Inco confidential compute — no off-chain custody.
                      </p>
                    </div>
                  </details>
                </div>
              )}

              <div className="mb-5 grid gap-2 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {storyComplete ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  <span>Complete all 5 story panels</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {nftTokenId ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                  <span>Hold the minted Game NFT</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Decrypt via Inco attested decrypt</span>
                </div>
              </div>

              {promptVaultUuid ? (
                <div>
                  {isConnected ? (
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking || !storyComplete}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all"
                      style={{
                        backgroundColor: primaryColor,
                        color: '#000',
                        opacity: isUnlocking || !storyComplete ? 0.7 : 1,
                      }}
                    >
                      {isUnlocking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Decrypting...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Unlock secret epilogue
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Connect your wallet to access the vault
                    </p>
                  )}

                  {isUnlocking && unlockStep !== 'idle' && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-[11px] text-muted-foreground font-mono"
                    >
                      {STEP_LABEL[unlockStep]}
                    </motion.p>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 text-xs text-red-400"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Secret epilogue not available yet.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
