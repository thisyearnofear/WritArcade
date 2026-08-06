'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi'
import {
  clearDailyChallengeState,
  DAILY_CHALLENGE_CHAIN_ID,
  fetchDailyChallengeStart,
  loadDailyChallengeState,
  recordDailyChoice,
  resumeExistingSession,
  saveDailyChallengeState,
  startOnChainSession,
  type DailyChallengeClientState,
} from '@/lib/daily-challenge-client'

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
    async (panelIndex: number, choiceIndex: number) => {
      const current = state ?? loadDailyChallengeState()
      if (!current?.incoSessionId || !current.challengeId) return

      await recordDailyChoice({
        challengeId: current.challengeId,
        sessionId: current.incoSessionId,
        panelIndex,
        choiceIndex,
      })
    },
    [state]
  )

  const reset = useCallback(() => {
    clearDailyChallengeState()
    setState(null)
    setError(null)
  }, [])

  return {
    state,
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
