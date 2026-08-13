'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi'
import {
  clearDailyChallengeState,
  DAILY_CHALLENGE_CHAIN_ID,
  decryptPanelVerdict,
  fetchDailyChallengeStart,
  loadDailyChallengeState,
  recordDailyChoice,
  resumeExistingSession,
  saveDailyChallengeState,
  startOnChainSession,
  type DailyChallengeClientState,
  type PanelVerdict,
} from '@/lib/daily-challenge/daily-challenge-client'

export function useDailyChallengeOnchain() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: DAILY_CHALLENGE_CHAIN_ID })
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain()

  const [state, setState] = useState<DailyChallengeClientState | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-panel FHE verdicts (10 | 6 | 3 | 1) from DailyChallengeVault.panelVerdicts,
  // decrypted via attested-only-eoa signatures. panelVerdicts[i] === null means the
  // handle existed but the wallet could not decrypt it (older vault / wrong chain /
  // ACL miss) — the UI still has a keyword-based pulse in that case.
  const [panelVerdicts, setPanelVerdicts] = useState<(PanelVerdict | null)[]>([])

  useEffect(() => {
    setState(loadDailyChallengeState())
  }, [])

  const ensureBaseChain = useCallback(async () => {
    if (chainId === DAILY_CHALLENGE_CHAIN_ID) return
    await switchChainAsync({ chainId: DAILY_CHALLENGE_CHAIN_ID })
  }, [chainId, switchChainAsync])

  const beginSession = useCallback(async () => {
    if (!isConnected || !address || !walletClient || !publicClient) {
      throw new Error('Connect your wallet on Base to play the daily challenge')
    }

    setIsStarting(true)
    setError(null)

    try {
      await ensureBaseChain()

      const startData = await fetchDailyChallengeStart('basepaint')
      const { challenge, onChain } = startData

      if (!onChain.deckShuffled) {
        throw new Error(onChain.deckSetupError || 'Daily deck is not ready yet. Please try again.')
      }

      const onChainSession = await startOnChainSession({
        day: onChain.day,
        vaultAddress: onChain.vaultAddress,
        walletClient,
        publicClient,
        account: address,
      })

      const nextState: DailyChallengeClientState = {
        challengeId: challenge.id,
        day: challenge.day,
        vaultAddress: onChain.vaultAddress,
        incoSessionId: onChainSession.sessionId,
        modifierHandles: onChainSession.modifierHandles,
        scoreHandle: onChainSession.scoreHandle,
      }

      saveDailyChallengeState(nextState)
      setState(nextState)
      setPanelVerdicts([])
      return nextState
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start daily challenge session'
      setError(message)
      throw err
    } finally {
      setIsStarting(false)
    }
  }, [address, ensureBaseChain, isConnected, publicClient, walletClient])

  /**
   * Proactively look for a hand this wallet already paid for today (e.g. an
   * orphaned session from a failed earlier attempt or another device).
   * If found, restores it into local state — resuming never charges again.
   */
  const detectExistingSession = useCallback(
    async (day: number): Promise<DailyChallengeClientState | null> => {
      if (!isConnected || !address || !publicClient) return null

      const cached = state ?? loadDailyChallengeState()
      if (cached?.incoSessionId && cached.day === day) return cached

      setIsDetecting(true)
      try {
        const startData = await fetchDailyChallengeStart('basepaint')
        const { challenge, onChain } = startData
        if (!onChain.deckShuffled || onChain.day !== day) return null

        const resumed = await resumeExistingSession({
          day: onChain.day,
          vaultAddress: onChain.vaultAddress,
          publicClient,
          account: address,
        })
        if (!resumed) return null

        const nextState: DailyChallengeClientState = {
          challengeId: challenge.id,
          day: challenge.day,
          vaultAddress: onChain.vaultAddress,
          incoSessionId: resumed.sessionId,
          modifierHandles: resumed.modifierHandles,
          scoreHandle: resumed.scoreHandle,
        }
        saveDailyChallengeState(nextState)
        setState(nextState)
        setPanelVerdicts([])
        return nextState
      } catch (err) {
        console.warn('[DailyChallenge] Existing-session detection failed:', err)
        return null
      } finally {
        setIsDetecting(false)
      }
    },
    [address, isConnected, publicClient, state]
  )

  const recordChoice = useCallback(
    async (panelIndex: number, choiceIndex: number): Promise<void> => {
      const current = state ?? loadDailyChallengeState()
      if (!current?.incoSessionId || !current.challengeId) return

      const result = await recordDailyChoice({
        challengeId: current.challengeId,
        sessionId: current.incoSessionId,
        panelIndex,
        choiceIndex,
      })

      // Decrypt this panel's FHE verdict when the vault supports it. Resolve to
      // null on any failure so the UI can fall back to the keyword pulse.
      let verdict: PanelVerdict | null = null
      if (result.panelVerdictHandle && walletClient) {
        try {
          verdict = await decryptPanelVerdict(result.panelVerdictHandle, walletClient)
        } catch (err) {
          console.warn('[DailyChallenge] Panel verdict decrypt failed:', err)
        }
      }

      setPanelVerdicts((prev) => {
        const next = [...prev]
        next[panelIndex] = verdict
        return next
      })
    },
    [state, walletClient]
  )

  const reset = useCallback(() => {
    clearDailyChallengeState()
    setState(null)
    setError(null)
    setPanelVerdicts([])
  }, [])

  return {
    state,
    panelVerdicts,
    isStarting,
    isDetecting,
    isSwitchingChain,
    error,
    isActive: Boolean(state?.incoSessionId),
    beginSession,
    detectExistingSession,
    recordChoice,
    reset,
  }
}
