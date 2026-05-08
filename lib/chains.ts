/**
 * Single source of truth for chain IDs and human-friendly chain metadata
 * used across the writersarcade UI and payment strategies.
 *
 * Add new chains here, then import from this module everywhere — never
 * hard-code chain IDs in components or services.
 */

export const BASE_MAINNET_CHAIN_ID = 8453 as const
export const BASE_SEPOLIA_CHAIN_ID = 84532 as const
export const MEZO_TESTNET_CHAIN_ID = 31611 as const
export const MEZO_MAINNET_CHAIN_ID = 31612 as const
export const STORY_AENEID_CHAIN_ID = 1315 as const

export type SupportedChainId =
  | typeof BASE_MAINNET_CHAIN_ID
  | typeof BASE_SEPOLIA_CHAIN_ID
  | typeof MEZO_TESTNET_CHAIN_ID
  | typeof MEZO_MAINNET_CHAIN_ID
  | typeof STORY_AENEID_CHAIN_ID

/**
 * High-level "ecosystem" a chain belongs to in our app's mental model.
 * Used by UI to colour-code, group balances, and route payment flows.
 */
export type ChainEcosystem = 'base' | 'mezo' | 'story'

export interface ChainInfo {
  id: number
  name: string
  shortName: string
  ecosystem: ChainEcosystem
  /** Tailwind text color class for the chain. */
  color: string
  /** Tailwind background+border classes for chips/badges. */
  bgColor: string
  /** What this chain is used for in the app. */
  purpose: string
  isTestnet: boolean
  isSupported: boolean
}

const UNSUPPORTED: ChainInfo = {
  id: 0,
  name: 'Unsupported Network',
  shortName: 'Unsupported',
  ecosystem: 'base',
  color: 'text-amber-600 dark:text-amber-400',
  bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  purpose: 'Switch to a supported network',
  isTestnet: false,
  isSupported: false,
}

const CHAINS: Record<number, ChainInfo> = {
  [BASE_MAINNET_CHAIN_ID]: {
    id: BASE_MAINNET_CHAIN_ID,
    name: 'Base',
    shortName: 'Base',
    ecosystem: 'base',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    purpose: 'Writer coin payments',
    isTestnet: false,
    isSupported: true,
  },
  [BASE_SEPOLIA_CHAIN_ID]: {
    id: BASE_SEPOLIA_CHAIN_ID,
    name: 'Base Sepolia',
    shortName: 'Base Sepolia',
    ecosystem: 'base',
    color: 'text-blue-500 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    purpose: 'Testnet payments',
    isTestnet: true,
    isSupported: true,
  },
  [MEZO_TESTNET_CHAIN_ID]: {
    id: MEZO_TESTNET_CHAIN_ID,
    name: 'Mezo Matsnet',
    shortName: 'Mezo',
    ecosystem: 'mezo',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
    purpose: 'MUSD payments',
    isTestnet: true,
    isSupported: true,
  },
  [MEZO_MAINNET_CHAIN_ID]: {
    id: MEZO_MAINNET_CHAIN_ID,
    name: 'Mezo',
    shortName: 'Mezo',
    ecosystem: 'mezo',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
    purpose: 'MUSD payments',
    isTestnet: false,
    isSupported: true,
  },
  [STORY_AENEID_CHAIN_ID]: {
    id: STORY_AENEID_CHAIN_ID,
    name: 'Story Aeneid',
    shortName: 'Story',
    ecosystem: 'story',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    purpose: 'IP registration',
    isTestnet: true,
    isSupported: true,
  },
}

/** Look up chain metadata by id; returns an "unsupported" stub for unknown ids. */
export function getChainInfo(chainId: number | undefined): ChainInfo {
  if (!chainId) return UNSUPPORTED
  return CHAINS[chainId] ?? UNSUPPORTED
}

/** Map a payment-token type → the chain id its strategy executes on. */
export function chainForPaymentPath(path: 'writercoin' | 'musd'): number {
  return path === 'musd' ? MEZO_TESTNET_CHAIN_ID : BASE_MAINNET_CHAIN_ID
}
