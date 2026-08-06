'use client'

import type { WalletClient, PublicClient, Hex, Log } from 'viem'
import { decodeEventLog } from 'viem'
import {
  DAILY_CHALLENGE_VAULT_ABI,
  type DailyChallengeSource,
} from '@/lib/daily-challenge'
import { INCO_LIGHTNING_ABI, INCO_LIGHTNING_ADDRESS } from '@/lib/inco'
import { BASE_MAINNET_CHAIN_ID } from '@/lib/chains'

export const DAILY_CHALLENGE_STORAGE_KEY = 'writersarcade:daily-challenge'

export interface DailyChallengeClientState {
  challengeId: string
  day: number
  vaultAddress: `0x${string}`
  incoSessionId: `0x${string}` | null
  modifierHandles: string[]
  scoreHandle: string | null
}

export interface DailyChallengeStartResponse {
  challenge: { id: string; day: number }
  onChain: {
    vaultAddress: `0x${string}`
    day: number
    deckShuffled: boolean
    deckSetupError?: string | null
    needsDeckSetup: boolean
    needsClientStartSession: boolean
  }
}

const SESSION_STARTED_EVENT = {
  type: 'event',
  name: 'SessionStarted',
  inputs: [
    { name: 'sessionId', type: 'bytes32', indexed: true },
    { name: 'player', type: 'address', indexed: true },
    { name: 'day', type: 'uint256', indexed: true },
  ],
} as const

export function loadDailyChallengeState(): DailyChallengeClientState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(DAILY_CHALLENGE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DailyChallengeClientState
  } catch {
    return null
  }
}

export function saveDailyChallengeState(state: DailyChallengeClientState): void {
  sessionStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, JSON.stringify(state))
}

export function clearDailyChallengeState(): void {
  sessionStorage.removeItem(DAILY_CHALLENGE_STORAGE_KEY)
}

export function getDailyVaultAddress(): `0x${string}` | null {
  const addr = process.env.NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS
  return addr ? (addr as `0x${string}`) : null
}

export async function fetchDailyChallengeStart(
  sourceType: DailyChallengeSource['sourceType'] = 'basepaint'
): Promise<DailyChallengeStartResponse> {
  const response = await fetch('/api/daily-challenge/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceType }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to start daily challenge')
  }

  return response.json()
}

export async function readStartSessionFee(publicClient: PublicClient): Promise<bigint> {
  const unitFee = await publicClient.readContract({
    address: INCO_LIGHTNING_ADDRESS,
    abi: INCO_LIGHTNING_ABI,
    functionName: 'getFee',
  }) as bigint

  return unitFee * 5n
}

function parseSessionStarted(logs: Log[]): `0x${string}` | null {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: [SESSION_STARTED_EVENT],
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName === 'SessionStarted') {
        return decoded.args.sessionId as `0x${string}`
      }
    } catch {
      // not our event
    }
  }
  return null
}

export async function startOnChainSession(params: {
  day: number
  vaultAddress: `0x${string}`
  walletClient: WalletClient
  publicClient: PublicClient
  account: `0x${string}`
}): Promise<{
  sessionId: `0x${string}`
  modifierHandles: string[]
  scoreHandle: string
}> {
  const fee = await readStartSessionFee(params.publicClient)

  const hash = await params.walletClient.writeContract({
    chain: params.walletClient.chain,
    account: params.account,
    address: params.vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'startSession',
    args: [BigInt(params.day)],
    value: fee,
  })

  const receipt = await params.publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error('startSession transaction failed')
  }

  const sessionId = parseSessionStarted(receipt.logs)
  if (!sessionId) {
    throw new Error('Could not parse SessionStarted event from transaction')
  }

  const modifierHandles = await params.publicClient.readContract({
    address: params.vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'getSessionModifiers',
    args: [sessionId],
  }) as readonly Hex[]

  const scoreHandle = await params.publicClient.readContract({
    address: params.vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'getSessionScore',
    args: [sessionId],
  }) as Hex

  return {
    sessionId,
    modifierHandles: [...modifierHandles],
    scoreHandle,
  }
}

export async function completeOnChainReveal(params: {
  sessionId: `0x${string}`
  vaultAddress: `0x${string}`
  walletClient: WalletClient
  publicClient: PublicClient
  account: `0x${string}`
}): Promise<Hex> {
  const hash = await params.walletClient.writeContract({
    chain: params.walletClient.chain,
    account: params.account,
    address: params.vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'completeAndReveal',
    args: [params.sessionId],
  })

  const receipt = await params.publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error('completeAndReveal transaction failed')
  }

  return hash
}

export async function recordDailyChoice(params: {
  challengeId: string
  sessionId: string
  panelIndex: number
  choiceIndex: number
}): Promise<void> {
  const response = await fetch(`/api/daily-challenge/${params.challengeId}/record-choice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: params.sessionId,
      panelIndex: params.panelIndex,
      choiceIndex: params.choiceIndex,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to record choice on-chain')
  }
}

export async function submitDailyReveal(params: {
  challengeId: string
  sessionId: string
  gameId: string
  score: number
  revealedModifierIds: number[]
  playerAddress: string
}): Promise<{ rank: number }> {
  const response = await fetch(`/api/daily-challenge/${params.challengeId}/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to submit daily challenge score')
  }

  const data = await response.json()
  return { rank: data.rank as number }
}

export const DAILY_CHALLENGE_CHAIN_ID = BASE_MAINNET_CHAIN_ID
