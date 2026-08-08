/**
 * Daily Challenge client library for WritersArcade + Inco.
 *
 * Manages the confidential game session lifecycle:
 * - Fetches today's challenge source (article, marketing copy, or BasePaint canvas)
 * - Starts an Inco game session (shuffles deck, deals 5 encrypted modifiers)
 * - Records panel choices (encrypted scoring via e.select)
 * - Reveals modifiers + score at the finale (e.reveal + attestedDecrypt)
 * - Fetches the leaderboard (publicly revealed scores)
 *
 * BasePaint integration: fetches daily theme + canvas image via the public API.
 * The theme becomes the story prompt seed; the canvas image becomes the visual
 * seed for AI image generation.
 */

import type { WalletClient, Transport, Chain, Account } from 'viem'

// ── Types ──────────────────────────────────────────────────────────────────

export type {
  BasePaintTheme,
  BasePaintCanvasStats,
  BasePaintContributor,
  BasePaintDailySource,
  DualDailySource,
  ResolvedDailySource,
} from '@/lib/basepaint/types'
export {
  getBasePaintDay,
  fetchBasePaintTheme,
  getBasePaintCanvasUrl,
  getBasePaintCanvasProxyUrl,
  getBasePaintAnimationUrl,
  getBasePaintDayUrl,
  buildBasePaintPromptText,
  buildDualSourcePromptText,
  pickAccentColor,
  getBasePaintCanvasDescription,
  describeBasePaintCanvas,
  getBasePaintDailySource,
  getDualDailySource,
  getTodaysDailySource,
  setFeaturedDailyArticle,
  ensureTodaysFeaturedArticle,
  fetchBasePaintCanvasStats,
} from '@/lib/basepaint'

export interface DailyChallengeSource {
  day: number
  sourceType: 'dual' | 'article' | 'marketing-copy' | 'basepaint'
  sourceUrl?: string
  basePaintDay?: number
  theme: string
  canvasTheme?: string
  articleTitle?: string
  articleAuthor?: string
  palette?: string[]
  canvasUrl?: string
  canvasDescription?: string
  promptText?: string
}
export interface Modifier {
  id: number
  category: 'tone' | 'complication' | 'stakes' | 'resolution'
  name: string
  prompt: string
}

export interface GameSession {
  sessionId: string
  challengeDay: number
  modifierHandles: string[]
  panelsCompleted: number
  completed: boolean
  revealed: boolean
  score?: number
  revealedModifiers?: Modifier[]
}

export interface LeaderboardEntry {
  playerAddress: string
  score: number
  revealedAt: Date
  gameId: string
  gameSlug: string
  gameTitle: string
}

// ── Modifier Deck ──────────────────────────────────────────────────────────

import modifiersData from './modifiers.json'

export const MODIFIER_DECK: Modifier[] = modifiersData as Modifier[]
export const DECK_SIZE = 52
export const PANELS_PER_GAME = 5

export function getModifierById(id: number): Modifier | undefined {
  return MODIFIER_DECK.find((m) => m.id === id)
}

export function getModifiersForPanel(panelIndex: number): Modifier[] {
  // Each panel draws from a specific category:
  // Panel 1: tone, Panel 2: complication, Panel 3: stakes, Panel 4: complication, Panel 5: resolution
  const categories: Modifier['category'][] = [
    'tone',
    'complication',
    'stakes',
    'complication',
    'resolution',
  ]
  const category = categories[panelIndex] || 'tone'
  return MODIFIER_DECK.filter((m) => m.category === category)
}

// ── Inco Contract Interaction ──────────────────────────────────────────────

export const DAILY_CHALLENGE_VAULT_ABI = [
  {
    name: 'createDailyChallenge',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'startSession',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [{ name: 'sessionId', type: 'bytes32' }],
  },
  {
    name: 'recordChoice',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'panelIndex', type: 'uint8' },
      { name: 'choiceIndex', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'completeAndReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'getStartSessionFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSessionModifiers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [{ name: 'handles', type: 'bytes32[5]' }],
  },
  {
    name: 'getSessionScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'isSessionRevealed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getSessionPlayer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getSessionChallengeDay',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getChallengeStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'day', type: 'uint256' }],
    outputs: [
      { name: 'totalSessions', type: 'uint256' },
      { name: 'revealedSessions', type: 'uint256' },
      { name: 'deckShuffled', type: 'bool' },
    ],
  },
  {
    name: 'getPlayerSessions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
] as const

/**
 * Get the DailyChallengeVault contract address.
 */
export function getVaultAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS
  if (!addr) {
    throw new Error(
      'NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS is not configured. ' +
      'Deploy DailyChallengeVault.sol and set this env var.'
    )
  }
  return addr as `0x${string}`
}

/**
 * Server wallet with SESSION_MANAGER_ROLE on DailyChallengeVault.
 */
export function getSessionManagerPrivateKey(): `0x${string}` | null {
  const key =
    process.env.DAILY_CHALLENGE_MANAGER_PRIVATE_KEY ||
    process.env.INCO_VAULT_MANAGER_PRIVATE_KEY ||
    process.env.STORY_PLATFORM_PRIVATE_KEY

  return key ? (key as `0x${string}`) : null
}

export async function getSessionManagerAddress(): Promise<`0x${string}` | null> {
  const privateKey = getSessionManagerPrivateKey()
  if (!privateKey) return null

  const { privateKeyToAccount } = await import('viem/accounts')
  return privateKeyToAccount(privateKey).address
}

async function getSessionManagerAccount() {
  const privateKey = getSessionManagerPrivateKey()
  if (!privateKey) {
    throw new Error(
      'DAILY_CHALLENGE_MANAGER_PRIVATE_KEY is not configured. Grant SESSION_MANAGER_ROLE to the server wallet and fund it on Base.'
    )
  }

  const { privateKeyToAccount } = await import('viem/accounts')
  return privateKeyToAccount(privateKey)
}

export async function createSessionManagerWalletClient() {
  const account = await getSessionManagerAccount()

  const { createWalletClient, http } = await import('viem')
  const { base } = await import('viem/chains')

  return createWalletClient({
    account,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  })
}

export async function createDailyChallengePublicClient() {
  const { createPublicClient, http } = await import('viem')
  const { base } = await import('viem/chains')

  return createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  })
}

/** ETypes.Uint256 enum value in @inco/lightning Types.sol */
const ETYPE_UINT256 = 8

export type ShuffleDailyDeckResult =
  | { success: true; day: number; alreadyShuffled: true }
  | { success: true; day: number; alreadyShuffled: false; txHash: `0x${string}` }

export async function isDailyDeckShuffled(day: number): Promise<boolean> {
  const publicClient = await createDailyChallengePublicClient()
  const vaultAddress = getVaultAddress()

  const stats = await publicClient.readContract({
    address: vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'getChallengeStats',
    args: [BigInt(day)],
  }) as [bigint, bigint, boolean]

  return stats[2]
}

/**
 * Shuffle today's modifier deck on-chain. Idempotent — no-op if already shuffled.
 * Requires SESSION_MANAGER_ROLE on the server wallet.
 */
export async function shuffleDailyDeck(day: number): Promise<ShuffleDailyDeckResult> {
  if (await isDailyDeckShuffled(day)) {
    return { success: true, day, alreadyShuffled: true }
  }

  const { INCO_LIGHTNING_ABI, INCO_LIGHTNING_ADDRESS } = await import('./inco')

  const vaultAddress = getVaultAddress()
  const publicClient = await createDailyChallengePublicClient()
  const account = await getSessionManagerAccount()

  const listFee = await publicClient.readContract({
    address: INCO_LIGHTNING_ADDRESS,
    abi: INCO_LIGHTNING_ABI,
    functionName: 'getEListFee',
    args: [52, ETYPE_UINT256],
  }) as bigint

  const requiredValue = listFee * 2n
  const balance = await publicClient.getBalance({ address: account.address })
  if (balance < requiredValue) {
    throw new Error(
      `Session manager ${account.address} needs Base ETH to shuffle the daily deck (requires ~${Number(requiredValue) / 1e18} ETH incl. Inco fees; balance ${Number(balance) / 1e18} ETH).`
    )
  }

  const walletClient = await createSessionManagerWalletClient()

  const txHash = await walletClient.writeContract({
    address: vaultAddress,
    abi: DAILY_CHALLENGE_VAULT_ABI,
    functionName: 'createDailyChallenge',
    args: [BigInt(day)],
    value: requiredValue,
    account,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

  if (receipt.status !== 'success') {
    throw new Error('On-chain deck shuffle failed')
  }

  return { success: true, day, txHash, alreadyShuffled: false }
}

/** Shuffle the deck if needed; safe to call from cron, page load, or session start. */
export async function ensureDailyDeckShuffled(day: number): Promise<ShuffleDailyDeckResult> {
  return shuffleDailyDeck(day)
}

// ── Server-side modifier decrypt (AI narrative only — never sent to client) ─

/**
 * Cards are dealt as canonical IDs 1–52. Do not wrap the value: wrapping
 * rotated card 52 to card 1 and made revealed modifiers disagree with scoring.
 */
export function modifierIdFromCardValue(value: bigint): number | null {
  if (value < 1n || value > BigInt(DECK_SIZE)) return null
  return Number(value)
}

/**
 * Decrypt one modifier card handle using the narrative operator wallet.
 * Used server-side to shape AI prompts without exposing the modifier to the player.
 */
export async function decryptModifierHandleForAi(handle: string): Promise<number | null> {
  const privateKey = getSessionManagerPrivateKey()
  if (!privateKey) return null

  try {
    const { getIncoLightning, formatHandle } = await import('./inco')
    const { privateKeyToAccount } = await import('viem/accounts')
    const { createWalletClient, http } = await import('viem')
    const { base } = await import('viem/chains')

    const account = privateKeyToAccount(privateKey)
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
    })

    const zap = await getIncoLightning()
    const results = await zap.attestedDecrypt(
      walletClient as WalletClient<Transport, Chain, Account>,
      [formatHandle(handle)]
    )

    const value = results[0]?.plaintext?.value
    if (typeof value !== 'bigint') return null
    return modifierIdFromCardValue(value)
  } catch (err) {
    console.error('[DailyChallenge] Server modifier decrypt failed:', err)
    return null
  }
}

/**
 * Resolve the hidden modifier prompt for a panel during daily challenge gameplay.
 */
export async function getModifierPromptForPanel(
  incoSessionId: string,
  panelIndex: number
): Promise<string | null> {
  if (panelIndex < 0 || panelIndex >= PANELS_PER_GAME) return null

  try {
    const vaultAddress = getVaultAddress()
    const [publicClient, managerAddress] = await Promise.all([
      createDailyChallengePublicClient(),
      getSessionManagerAddress(),
    ])
    if (!managerAddress) return null

    const handles = await publicClient.readContract({
      address: vaultAddress,
      abi: DAILY_CHALLENGE_VAULT_ABI,
      functionName: 'getSessionModifiers',
      args: [incoSessionId as `0x${string}`],
      account: managerAddress,
    }) as readonly string[]

    const handle = handles[panelIndex]
    if (!handle) return null

    const modifierId = await decryptModifierHandleForAi(handle)
    if (!modifierId) return null

    const modifier = getModifierById(modifierId)
    if (!modifier) return null

    return getModifierPrompt(modifier)
  } catch (err) {
    console.error('[DailyChallenge] Failed to resolve modifier prompt:', err)
    return null
  }
}

// ── Inco Decryption (client-side, requires wallet) ─────────────────────────

/**
 * Decrypt a player's 5 modifier handles to reveal which narrative cards they drew.
 * Called at the finale — the player sees their "hidden hand."
 */
export async function decryptModifiers(
  handles: string[],
  walletClient: WalletClient<Transport, Chain, Account>
): Promise<Modifier[]> {
  const { getIncoLightning, formatHandle } = await import('./inco')
  const zap = await getIncoLightning()

  const results = await zap.attestedDecrypt(
    walletClient,
    handles.map((h) => formatHandle(h))
  )

  const modifierIds = results
    .map((r) => {
      const value = r.plaintext.value
      return typeof value === 'bigint' ? modifierIdFromCardValue(value) : null
    })
    .filter((id): id is number => id !== null)

  return modifierIds
    .map((id) => getModifierById(id))
    .filter((m): m is Modifier => m !== undefined)
}

/**
 * Decrypt the player's final score.
 */
export async function decryptScore(
  handle: string,
  walletClient: WalletClient<Transport, Chain, Account>
): Promise<number> {
  const { getIncoLightning, formatHandle } = await import('./inco')
  const zap = await getIncoLightning()

  const results = await zap.attestedDecrypt(walletClient, [formatHandle(handle)])
  const value = results[0]?.plaintext?.value
  if (typeof value !== 'bigint') return 0
  return Number(value)
}

export interface VerifiedDailyChallengeResult {
  score: number
  modifierIds: number[]
}

/**
 * Derive a revealed leaderboard entry from Inco handles the server is allowed
 * to decrypt. Never accept these values from a browser request.
 */
export async function deriveDailyChallengeResult(
  sessionId: `0x${string}`
): Promise<VerifiedDailyChallengeResult> {
  const [vaultAddress, publicClient, walletClient, managerAddress] = await Promise.all([
    Promise.resolve(getVaultAddress()),
    createDailyChallengePublicClient(),
    createSessionManagerWalletClient(),
    getSessionManagerAddress(),
  ])

  if (!managerAddress) {
    throw new Error('Daily challenge session manager is not configured')
  }

  const [modifierHandles, scoreHandle] = await Promise.all([
    publicClient.readContract({
      address: vaultAddress,
      abi: DAILY_CHALLENGE_VAULT_ABI,
      functionName: 'getSessionModifiers',
      args: [sessionId],
      account: managerAddress,
    }) as Promise<readonly string[]>,
    publicClient.readContract({
      address: vaultAddress,
      abi: DAILY_CHALLENGE_VAULT_ABI,
      functionName: 'getSessionScore',
      args: [sessionId],
      account: managerAddress,
    }) as Promise<string>,
  ])

  const authorizedWallet = walletClient as unknown as WalletClient<Transport, Chain, Account>
  const [modifiers, score] = await Promise.all([
    decryptModifiers([...modifierHandles], authorizedWallet),
    decryptScore(scoreHandle, authorizedWallet),
  ])

  if (modifiers.length !== PANELS_PER_GAME) {
    throw new Error('Unable to verify every revealed modifier')
  }
  if (!Number.isInteger(score) || score < 0 || score > PANELS_PER_GAME * 10 || score % 10 !== 0) {
    throw new Error('On-chain score is outside the valid range')
  }

  return { score, modifierIds: modifiers.map((modifier) => modifier.id) }
}

// ── Modifier Prompt Builder ───────────────────────────────────────────────

/**
 * Build the AI system prompt constraint for a given modifier.
 * This is passed to the game AI service to shape the narrative for that panel.
 */
export function getModifierPrompt(modifier: Modifier): string {
  return `[HIDDEN MODIFIER — ${modifier.category.toUpperCase()}: ${modifier.name}] ${modifier.prompt} The player does not know this modifier is in effect. Shape the narrative and choices around it without revealing it explicitly.`
}

/**
 * Build the reveal text shown to the player at the finale.
 */
export function formatModifierReveal(modifiers: Modifier[]): string {
  const lines = modifiers.map((m, i) => {
    return `Panel ${i + 1}: ${m.category.toUpperCase()} — ${m.name}`
  })
  return `Your hidden hand:\n${lines.join('\n')}`
}
