'use client'

import type { WalletClient, PublicClient, Hex, Log } from 'viem'
import { decodeEventLog } from 'viem'
import {
  DAILY_CHALLENGE_VAULT_ABI,
  type DailyChallengeSource,
} from '@/lib/daily-challenge'
import { INCO_LIGHTNING_ABI, INCO_LIGHTNING_ADDRESS } from '@/lib/daily-challenge/inco'
import { BASE_MAINNET_CHAIN_ID } from '@/lib/wallet/chains'

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

// localStorage (not sessionStorage): a paid on-chain session must survive a tab
// close so the player can resume instead of paying the Inco fee again.
export function loadDailyChallengeState(): DailyChallengeClientState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DAILY_CHALLENGE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DailyChallengeClientState
  } catch {
    return null
  }
}

export function saveDailyChallengeState(state: DailyChallengeClientState): void {
  localStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, JSON.stringify(state))
}

export function clearDailyChallengeState(): void {
  localStorage.removeItem(DAILY_CHALLENGE_STORAGE_KEY)
}

export function getDailyVaultAddress(): `0x${string}` | null {
  const addr = process.env.NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS
  return addr ? (addr as `0x${string}`) : null
}

export async function fetchDailyChallengeStart(
  sourceType: DailyChallengeSource['sourceType'] = 'dual'
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

/**
 * Read the dealt hand + score handle for a session.
 * The vault guards these views (session player or SESSION_MANAGER_ROLE only),
 * so the eth_call MUST be sent from the player's account — a zero-address
 * sender reverts with "DailyChallengeVault: not authorized".
 */
async function loadSessionHandles(params: {
  sessionId: `0x${string}`
  vaultAddress: `0x${string}`
  publicClient: PublicClient
  account: `0x${string}`
}): Promise<{ modifierHandles: string[]; scoreHandle: string }> {
  const modifierHandles = await params.publicClient.readContract({
    address: params.vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'getSessionModifiers',
    args: [params.sessionId],
    account: params.account,
  }) as readonly Hex[]

  const scoreHandle = await params.publicClient.readContract({
    address: params.vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'getSessionScore',
    args: [params.sessionId],
    account: params.account,
  }) as Hex

  return {
    modifierHandles: [...modifierHandles],
    scoreHandle,
  }
}

/**
 * Find this player's existing (already paid-for) session for a given day by
 * scanning SessionStarted events backwards in RPC-friendly chunks.
 * Returns null if none is found or the RPC refuses log queries.
 */
export async function findExistingSessionForDay(params: {
  publicClient: PublicClient
  vaultAddress: `0x${string}`
  account: `0x${string}`
  day: number
  lookbackBlocks?: bigint
}): Promise<`0x${string}` | null> {
  const CHUNK = 9_000n // Base public RPCs cap eth_getLogs at ~10k blocks
  const lookback = params.lookbackBlocks ?? 60_000n // ~33 hours at 2s blocks

  let toBlock = await params.publicClient.getBlockNumber()
  const floor = toBlock > lookback ? toBlock - lookback : 0n

  try {
    while (toBlock >= floor) {
      const fromBlock = toBlock - CHUNK > floor ? toBlock - CHUNK : floor
      const logs = await params.publicClient.getLogs({
        address: params.vaultAddress,
        event: { ...SESSION_STARTED_EVENT, anonymous: false } as const,
        args: { player: params.account, day: BigInt(params.day) },
        fromBlock,
        toBlock,
      })
      if (logs.length > 0) {
        const sessionId = logs[logs.length - 1].args.sessionId
        if (sessionId) return sessionId as `0x${string}`
      }
      if (fromBlock <= floor) break
      toBlock = fromBlock - 1n
    }
  } catch {
    return null // RPC log limits — fall through to a fresh paid session
  }
  return null
}

/**
 * Resume an existing paid session for today without paying again.
 * Returns null when this wallet has no unrevealed session for the day.
 */
export async function resumeExistingSession(params: {
  day: number
  vaultAddress: `0x${string}`
  publicClient: PublicClient
  account: `0x${string}`
}): Promise<{
  sessionId: `0x${string}`
  modifierHandles: string[]
  scoreHandle: string
} | null> {
  const existingSessionId = await findExistingSessionForDay({
    publicClient: params.publicClient,
    vaultAddress: params.vaultAddress,
    account: params.account,
    day: params.day,
  })
  if (!existingSessionId) return null

  const revealed = await params.publicClient.readContract({
    address: params.vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'isSessionRevealed',
    args: [existingSessionId],
  }) as boolean
  if (revealed) return null

  const handles = await loadSessionHandles({
    sessionId: existingSessionId,
    vaultAddress: params.vaultAddress,
    publicClient: params.publicClient,
    account: params.account,
  })
  return { sessionId: existingSessionId, ...handles }
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
  // Resume before paying: if this wallet already dealt a hand for today
  // (e.g. a previous attempt died after payment), reuse it.
  const resumed = await resumeExistingSession(params)
  if (resumed) return resumed

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
    throw new Error('startSession transaction failed on-chain — check the hash on Basescan for the revert reason')
  }

  const sessionId = parseSessionStarted(receipt.logs)
  if (!sessionId) {
    throw new Error('startSession confirmed but no SessionStarted event found')
  }

  // Even if something fails from here on, the next attempt finds this
  // session via findExistingSessionForDay and resumes it without paying again.
  const handles = await loadSessionHandles({ sessionId, ...params })

  return {
    sessionId,
    ...handles,
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
