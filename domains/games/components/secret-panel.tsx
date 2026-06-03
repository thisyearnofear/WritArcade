'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Lock, Unlock, Eye, Loader2, ShieldCheck, Copy, Check } from 'lucide-react'
import { useWalletClient } from 'wagmi'
import type { WalletClient, Transport, Chain, Account } from 'viem'

type UnlockStep = 'idle' | 'authorizing' | 'loading_sdk' | 'requesting_decrypt' | 'done'

const STEP_LABEL: Record<UnlockStep, string> = {
  idle: '',
  authorizing: 'Verifying completion + NFT ownership…',
  loading_sdk: 'Loading CDR SDK (WASM)…',
  requesting_decrypt: 'Requesting CDR read on Story Aeneid…',
  done: 'Decrypted via CDR vault',
}

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
  cdrReadCondition: string
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

  const copyToClipboard = useCallback(async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      /* ignore clipboard errors */
    }
  }, [])

  const handleUnlock = useCallback(async () => {
    if (!isConnected || !walletAddress || !walletClient || !promptVaultUuid) {
      setError('Wallet or vault configuration missing')
      return
    }

    if (!storyComplete || !storySessionId) {
      setError('Finish all 5 story panels before unlocking the CDR vault.')
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

      setUnlockStep('loading_sdk')
      // Lazy-load the CDR SDK (5.5 MB WASM + Emscripten loader) only when the
      // user actually clicks Unlock, so it doesn't bloat the initial client bundle.
      const { createUserCdrClient, readVaultData } = await import('@/domains/story/services/cdr.service')

      const client = await createUserCdrClient(walletClient as unknown as WalletClient<Transport, Chain, Account>)
      if (!client) {
        throw new Error('CDR client unavailable. Try again later.')
      }

      setUnlockStep('requesting_decrypt')
      const decrypted = await readVaultData(client, promptVaultUuid!)
      if (!decrypted) {
        throw new Error('Failed to decrypt vault data')
      }

      const panel = JSON.parse(decrypted)

      setPanelData(panel)
      setAccessPolicy(data.accessPolicy ?? null)
      setUnlocked(true)
      setUnlockStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed')
      setUnlockStep('idle')
    } finally {
      setIsUnlocking(false)
    }
  }, [isConnected, walletAddress, walletClient, gameSlug, promptVaultUuid, storyComplete, storySessionId])

  return (
    <motion.div
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
          SECRET PANEL
        </span>
        {unlocked ? (
          <Eye className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        ) : (
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {promptVaultUuid && (
          <span className="ml-auto text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded-full border border-emerald-600/40 text-emerald-400 bg-emerald-950/40">
            Vaulted via CDR
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
                  <span>Unlocked via CDR Vault</span>
                </div>
                {accessPolicy && (
                  <div className="mt-3 grid gap-2 rounded-md border border-emerald-500/20 bg-emerald-950/20 p-3 text-[11px] text-emerald-100">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>CDR access policy satisfied</span>
                    </div>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-emerald-200/80">
                      <dt className="text-emerald-300/60">CDR network</dt>
                      <dd className="font-mono">Story Aeneid (chainId 1315)</dd>

                      <dt className="text-emerald-300/60">Read condition</dt>
                      <dd className="font-mono">{accessPolicy.cdrReadCondition}</dd>

                      <dt className="text-emerald-300/60">Gate NFT</dt>
                      <dd className="font-mono flex items-center gap-1">
                        <span>{accessPolicy.nftContract.slice(0, 6)}…{accessPolicy.nftContract.slice(-4)}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(accessPolicy.nftContract, 'nft')}
                          className="text-emerald-300/60 hover:text-emerald-200"
                          aria-label="Copy NFT contract address"
                        >
                          {copiedField === 'nft' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </dd>

                      <dt className="text-emerald-300/60">Token ID</dt>
                      <dd className="font-mono">#{accessPolicy.nftTokenId} (chain {accessPolicy.nftChainId})</dd>

                      <dt className="text-emerald-300/60">Panels completed</dt>
                      <dd className="font-mono">{accessPolicy.completedPanels} / 5</dd>

                      {promptVaultUuid && (
                        <>
                          <dt className="text-emerald-300/60">Vault UUID</dt>
                          <dd className="font-mono flex items-center gap-1 break-all">
                            <span>{promptVaultUuid.length > 14 ? `${promptVaultUuid.slice(0, 8)}…${promptVaultUuid.slice(-4)}` : promptVaultUuid}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(promptVaultUuid, 'uuid')}
                              className="text-emerald-300/60 hover:text-emerald-200"
                              aria-label="Copy vault UUID"
                            >
                              {copiedField === 'uuid' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
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
                A Secret Awaits
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                This game holds a hidden epilogue in a Story CDR vault. Unlock requires the minted game NFT and a completed 5-panel playthrough.
              </p>

              {/* CDR Encryption indicator — visible to judges even before unlock */}
              {promptVaultUuid && (
                <div className="mb-5 mx-auto max-w-md rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-left">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="font-semibold">Encrypted via Story CDR</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-emerald-200/80">
                    The epilogue is stored off-chain in a vault that only unlocks when Story Protocol verifies you hold the matching Game NFT. Even the platform can&apos;t read it without your token.
                  </p>
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-[10px] uppercase tracking-wider font-semibold text-emerald-400/80 hover:text-emerald-300 list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">▸</span>
                      What is Story CDR?
                    </summary>
                    <div className="mt-2 text-[10px] leading-relaxed text-emerald-200/70 space-y-1.5">
                      <p>
                        <span className="font-semibold text-emerald-300">CDR</span> = Cross-chain Data Rights.
                        A Story Protocol primitive that ties encrypted off-chain content to on-chain NFT ownership.
                      </p>
                      <p>
                        Writers can mint, sell, and gate their unreleased epilogues with the same NFT they already use to access the game — no separate subscriptions, no platform custody.
                      </p>
                    </div>
                  </details>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-emerald-400/70">
                    <span>Vault: {promptVaultUuid.length > 14 ? `${promptVaultUuid.slice(0, 8)}…${promptVaultUuid.slice(-4)}` : promptVaultUuid}</span>
                    <span className="text-emerald-600">·</span>
                    <span>Story Aeneid (1315)</span>
                  </div>
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
                  <span>Decrypt through CDR token-gated read condition</span>
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
                          Unlock Secure Panel
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
                  Vault access not available.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
