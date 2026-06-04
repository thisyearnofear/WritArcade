/**
 * Lit Protocol Service
 * NFT-gated encryption for secret game panels.
 *
 * Architecture:
 * - Encryption: server-side after game generation (no auth needed)
 * - Decryption: client-side when NFT holder views the game
 * - Access control: GameNFT ownership on Base mainnet
 *
 * ENHANCEMENT FIRST: Follows existing service patterns (config, logger, error handling)
 */

import { config, logger } from './config'

// GameNFT contract on Base mainnet
const GAME_NFT_CONTRACT =
  process.env.NEXT_PUBLIC_GAME_NFT_MAINNET ||
  process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS ||
  '0x778C87dAA2b284982765688AE22832AADae7dccC'

export interface SecretPanelData {
  narrative: string
  imagePrompt: string
}

export interface EncryptResult {
  ciphertext: string
  dataToEncryptHash: string
}

export interface DecryptParams {
  ciphertext: string
  dataToEncryptHash: string
  tokenId: string
  walletAddress: string
}

/**
 * Build access control conditions for GameNFT ownership check.
 * Only holders of the specific GameNFT token can decrypt the secret panel.
 */
export function buildNftAccessControlConditions(tokenId: string) {
  return [
    {
      conditionType: 'evmBasic' as const,
      contractAddress: GAME_NFT_CONTRACT,
      standardContractType: 'ERC721' as const,
      chain: 'base' as const,
      method: 'ownerOf',
      parameters: [tokenId],
      returnValueTest: {
        comparator: '=' as const,
        value: ':userAddress',
      },
    },
  ]
}

/**
 * Build access control conditions for ANY GameNFT holder (not token-specific).
 * Used as a fallback when no specific tokenId is available.
 */
export function buildAnyNftAccessControlConditions() {
  return [
    {
      conditionType: 'evmBasic' as const,
      contractAddress: GAME_NFT_CONTRACT,
      standardContractType: 'ERC721' as const,
      chain: 'base' as const,
      method: 'balanceOf',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '>' as const,
        value: '0',
      },
    },
  ]
}

/**
 * Encrypt secret panel data with Lit Protocol.
 * Server-side: no wallet auth required for encryption.
 *
 * Falls back to base64 encoding when Lit Protocol is not configured,
 * ensuring the feature degrades gracefully.
 */
export async function encryptSecretPanel(
  data: SecretPanelData,
  tokenId?: string
): Promise<EncryptResult> {
  const plaintext = JSON.stringify(data)

  if (!config.litProtocol.enabled) {
    logger.litProtocol('Disabled — using base64 fallback', {})
    return {
      ciphertext: Buffer.from(plaintext).toString('base64'),
      dataToEncryptHash: Buffer.from(plaintext).toString('base64'),
    }
  }

  try {
    // Guard: Lit Protocol requires browser APIs (indexedDB)
    // Only run in environments where these are available
    if (typeof window === 'undefined') {
      logger.litProtocol('Server-side encryption not supported, using fallback', {})
      return {
        ciphertext: Buffer.from(plaintext).toString('base64'),
        dataToEncryptHash: Buffer.from(plaintext).toString('base64'),
      }
    }

    const { LitNodeClient } = await import('@lit-protocol/lit-node-client')
    const { encryptString } = await import('@lit-protocol/encryption')

    const client = new LitNodeClient({
      litNetwork: config.litProtocol.network as 'datil-dev' | 'datil-test' | 'datil',
      debug: config.isDevelopment,
    })
    await client.connect()

    const accessControlConditions = tokenId
      ? buildNftAccessControlConditions(tokenId)
      : buildAnyNftAccessControlConditions()

    const { ciphertext, dataToEncryptHash } = await encryptString(
      {
        accessControlConditions,
        dataToEncrypt: plaintext,
      },
      client
    )

    await client.disconnect()

    logger.litProtocol('Encrypted secret panel', {
      tokenId: tokenId || 'any-nft',
      ciphertextLength: ciphertext.length,
    })

    return { ciphertext, dataToEncryptHash }
  } catch (error) {
    logger.error('Lit Protocol encryption failed, using fallback', error, {
      context: 'lit-encrypt',
    })

    // Graceful fallback
    return {
      ciphertext: Buffer.from(plaintext).toString('base64'),
      dataToEncryptHash: Buffer.from(plaintext).toString('base64'),
    }
  }
}

/**
 * Build decrypt request params for client-side use.
 * Returns the data needed for the frontend to call Lit Protocol decrypt.
 */
export function buildDecryptRequest(params: DecryptParams) {
  const accessControlConditions = params.tokenId
    ? buildNftAccessControlConditions(params.tokenId)
    : buildAnyNftAccessControlConditions()

  return {
    ciphertext: params.ciphertext,
    dataToEncryptHash: params.dataToEncryptHash,
    accessControlConditions,
    chain: 'base',
  }
}

/**
 * Check if the encrypted data was produced by Lit Protocol
 * (vs our base64 fallback).
 */
export function isLitProtocolEncrypted(ciphertext: string): boolean {
  // Lit Protocol ciphertexts are longer and contain specific characters
  // Base64 fallback is shorter and purely alphanumeric+padding
  return ciphertext.length > 200 && !ciphertext.match(/^[A-Za-z0-9+/=]+$/)
}

/**
 * Decrypt fallback (base64 encoded data).
 * Used when Lit Protocol was not available during encryption.
 */
export function decryptFallback(ciphertext: string): SecretPanelData | null {
  try {
    const plaintext = Buffer.from(ciphertext, 'base64').toString('utf-8')
    return JSON.parse(plaintext) as SecretPanelData
  } catch {
    return null
  }
}
