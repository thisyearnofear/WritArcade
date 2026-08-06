'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi'
import {
  clearDailyChallengeState,
  DAILY_CHALLENGE_CHAIN_ID,
  fetchDailyChallengeStart,
  loadDailyChallengeState,
  recordDailyChoice,
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
    isSwitchingChain,
    error,
    isActive: Boolean(state?.incoSessionId),
    beginSession,
    recordChoice,
    reset,
  }
}
