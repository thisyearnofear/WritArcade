/**
 * Farcaster Wallet Provider
 *
 * Implements WalletProvider interface for Farcaster Mini App SDK
 * Used in /app/mini-app environment
 */

import type { WalletProvider, TransactionRequest, TransactionResult } from './types'
import { createWalletClient, custom, WalletClient } from 'viem'
import { base } from 'viem/chains'

type FarcasterSDK = { 
  wallet: { 
    getEthereumProvider: () => Promise<unknown> 
  } 
}

let sdk: FarcasterSDK | null = null

// Lazy-load SDK only in browser and Farcaster context — uses dynamic import()
// so it is never evaluated at module load time (avoids require() in browser bundles)
async function getSDK(): Promise<FarcasterSDK | null> {
  if (sdk) return sdk
  if (typeof window === 'undefined') return null
  try {
    const farcasterModule = await import('@farcaster/miniapp-sdk')
    if (farcasterModule && farcasterModule.sdk) {
      sdk = farcasterModule.sdk as unknown as FarcasterSDK
    }
  } catch {
    // SDK not available
  }
  return sdk
}

async function getViemClient(): Promise<WalletClient | null> {
  try {
    const resolvedSdk = await getSDK()
    if (!resolvedSdk) return null
    const provider = await resolvedSdk.wallet.getEthereumProvider()
    if (!provider) return null

    const client = createWalletClient({
      chain: base,
      transport: custom(provider as import('viem').EIP1193Provider),
    })
    return client
  } catch (error) {
    console.error('[FarcasterWallet] Failed to get viem client:', error)
    return null
  }
}

export class FarcasterWalletProvider implements WalletProvider {
  type = 'farcaster' as const

  async isAvailable(): Promise<boolean> {
    try {
      const resolvedSdk = await getSDK()
      if (!resolvedSdk) return false
      const provider = await resolvedSdk.wallet.getEthereumProvider()
      return !!provider
    } catch {
      return false
    }
  }

  async getAddress(): Promise<`0x${string}` | null> {
    try {
      const client = await getViemClient()
      if (!client) return null
      const addresses = await client.getAddresses()
      return addresses[0] || null
    } catch (error) {
      console.error('[FarcasterWallet] Failed to get address:', error)
      return null
    }
  }

  async sendTransaction(request: TransactionRequest): Promise<TransactionResult> {
    try {
      const client = await getViemClient()
      if (!client) {
        return {
          transactionHash: '0x',
          success: false,
          error: 'Farcaster Wallet SDK not available',
        }
      }

      const [account] = await client.getAddresses()
      if (!account) {
        return {
          transactionHash: '0x',
          success: false,
          error: 'No wallet address found',
        }
      }

      // Validate request
      if (!request.to || !request.data) {
        throw new Error('Invalid transaction request: missing to or data')
      }

      const txRequest = {
        account,
        to: request.to,
        data: request.data,
        value: request.value ? BigInt(request.value) : undefined,
        chain: base,
      }

      console.log('[FarcasterWallet] Sending transaction:', txRequest)

      const hash = await client.sendTransaction(txRequest)

      return {
        transactionHash: hash,
        success: true,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[FarcasterWallet] Transaction error:', errorMessage)

      return {
        transactionHash: '0x',
        success: false,
        error: errorMessage,
      }
    }
  }

  async getChainId(): Promise<number> {
    // Farcaster Wallet is always on Base
    return 8453
  }
}

export const farcasterProvider = new FarcasterWalletProvider()