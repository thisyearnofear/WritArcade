import type { AuthUser } from '@/lib/auth'

export const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export type GameOwnershipSource =
  | 'payment_wallet'
  | 'siwe_user'
  | 'owner_wallet'
  | 'legacy_creator_wallet'
  | 'not_owner'

export interface OwnershipPayment {
  action?: string | null
  status?: string | null
  walletAddress?: string | null
  user?: {
    walletAddress?: string | null
  } | null
}

export interface OwnershipGame {
  ownerWallet?: string | null
  ownershipSource?: string | null
  creatorWallet?: string | null
  user?: {
    walletAddress?: string | null
  } | null
  payment?: OwnershipPayment | null
}

export interface OwnershipResult {
  authorized: boolean
  reason: GameOwnershipSource
  ownerWallet?: string
}

export function isWalletAddress(value: unknown): value is string {
  return typeof value === 'string' && WALLET_ADDRESS_PATTERN.test(value)
}

export function normalizeWallet(value: string | null | undefined) {
  return value?.toLowerCase()
}

function walletsEqual(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizeWallet(a)
  const right = normalizeWallet(b)
  return Boolean(left && right && left === right)
}

function paymentWallet(game: OwnershipGame) {
  if (game.payment?.action !== 'generate-game') return undefined
  if (game.payment.status !== 'verified') return undefined
  return game.payment.walletAddress || game.payment.user?.walletAddress || undefined
}

export function resolveGameOwnerWallet(game: OwnershipGame) {
  return (
    paymentWallet(game) ||
    game.ownerWallet ||
    game.user?.walletAddress ||
    game.creatorWallet ||
    undefined
  )
}

export function authorizeGameOwner(params: {
  game: OwnershipGame
  wallet?: string | null
  user?: AuthUser | null
}): OwnershipResult {
  const { game, wallet, user } = params
  const requesterWallet = wallet || user?.walletAddress

  const paidWallet = paymentWallet(game)
  if (walletsEqual(paidWallet, requesterWallet)) {
    return { authorized: true, reason: 'payment_wallet', ownerWallet: paidWallet }
  }

  if (walletsEqual(game.ownerWallet, requesterWallet)) {
    return { authorized: true, reason: 'owner_wallet', ownerWallet: game.ownerWallet || undefined }
  }

  if (walletsEqual(game.user?.walletAddress, requesterWallet) || walletsEqual(game.user?.walletAddress, user?.walletAddress)) {
    return { authorized: true, reason: 'siwe_user', ownerWallet: game.user?.walletAddress || undefined }
  }

  if (walletsEqual(game.creatorWallet, requesterWallet)) {
    return {
      authorized: true,
      reason: 'legacy_creator_wallet',
      ownerWallet: game.creatorWallet || undefined,
    }
  }

  return { authorized: false, reason: 'not_owner', ownerWallet: resolveGameOwnerWallet(game) }
}

export function ownershipError() {
  return 'Unauthorized: You do not own this game'
}
