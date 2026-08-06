/**
 * Inco Lightning JS client for WritersArcade.
 *
 * Replaces Lit Protocol + Story CDR for secret panel encryption/decryption.
 * Inco provides on-chain confidential compute on Base mainnet — no WASM,
 * no separate testnet, no backend proxy required.
 *
 * Flow:
 *   1. Server-side: encrypt secret panel via `encryptSecretPanel()`, store on-chain
 *      via SecretPanelVault.sol contract call
 *   2. Client-side: NFT holder calls `decryptSecretPanel()` via attestedDecrypt
 *
 * Docs: https://docs.inco.org
 */

import type { WalletClient, Transport, Chain, Account } from 'viem'
import type { HexString } from '@inco/lightning-js'

/** Inco Lightning singleton on Base mainnet (from @inco/lightning Lib.sol). */
export const INCO_LIGHTNING_ADDRESS =
  '0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624' as const

export const INCO_LIGHTNING_ABI = [
  {
    name: 'getFee',
    type: 'function',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getEListFee',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'length', type: 'uint16' },
      { name: 'listType', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

/** Max UTF-8 bytes per euint256 plaintext chunk (256 bits). */
export const INCO_CHUNK_BYTES = 31

/**
 * Lazy-load the Inco SDK to keep the initial bundle small.
 * The SDK is only needed when encrypting or decrypting secret panels.
 */

type IncoLightning = {
  encrypt: (
    value: bigint | boolean,
    options: {
      accountAddress: string
      dappAddress: string
      handleType: number
    }
  ) => Promise<HexString>
  attestedDecrypt: (
    walletClient: WalletClient<Transport, Chain, Account>,
    handles: HexString[],
    options?: {
      reencryptPubKey?: string
      reencryptKeypair?: { encodePublicKey: () => string }
      backoffConfig?: {
        maxRetries: number
        baseDelayInMs: number
        backoffFactor: number
      }
    }
  ) => Promise<Array<{ plaintext: { value: bigint | boolean } }>>
}

type LightningFactory = {
  baseMainnet: (opts?: { hostChainRpcUrls?: string[] }) => Promise<IncoLightning>
  baseSepoliaTestnet: (opts?: { hostChainRpcUrls?: string[] }) => Promise<IncoLightning>
}

let _zapPromise: Promise<IncoLightning> | null = null

/**
 * Get the Inco Lightning client singleton.
 * Uses Base mainnet in production, Base Sepolia in development.
 */
export async function getIncoLightning(): Promise<IncoLightning> {
  if (_zapPromise) return _zapPromise

  _zapPromise = (async () => {
    const { Lightning } = await import('@inco/lightning-js/lite')
    const factory = Lightning as unknown as LightningFactory

    const rpcUrls = process.env.NEXT_PUBLIC_BASE_RPC_URL
      ? [process.env.NEXT_PUBLIC_BASE_RPC_URL]
      : undefined

    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_INCO_NETWORK !== 'testnet') {
      return factory.baseMainnet(rpcUrls ? { hostChainRpcUrls: rpcUrls } : undefined)
    }
    return factory.baseSepoliaTestnet(rpcUrls ? { hostChainRpcUrls: rpcUrls } : undefined)
  })()

  return _zapPromise
}

/**
 * Get the SecretPanelVault contract address from env.
 */
export function getVaultAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_SECRET_PANEL_VAULT_ADDRESS
  if (!addr) {
    throw new Error(
      'NEXT_PUBLIC_SECRET_PANEL_VAULT_ADDRESS is not configured. ' +
      'Deploy SecretPanelVault.sol and set this env var.'
    )
  }
  return addr as `0x${string}`
}

/**
 * Get the GameNFT contract address from env.
 */
export function getGameNFTAddress(): `0x${string}` {
  return (
    (process.env.NEXT_PUBLIC_GAME_NFT_MAINNET as `0x${string}` | undefined) ||
    (process.env.NEXT_PUBLIC_GAME_NFT_ADDRESS as `0x${string}` | undefined) ||
    '0x32D0356f533cC429F94Db73f383bBb21a459E16b'
  )
}

// ── ABI for SecretPanelVault ──────────────────────────────────────────────

export const SECRET_PANEL_VAULT_ABI = [
  {
    name: 'storeSecretPanel',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'ciphertextChunks', type: 'bytes[]' },
    ],
    outputs: [],
  },
  {
    name: 'storeWordleAnswer',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'ciphertext', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'getSecretPanelHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getSecretPanelChunkCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSecretPanelChunkHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getWordleAnswerHandle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'hasSecretPanel',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'hasWordleAnswer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'grantAccessToNewOwner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'newOwner', type: 'address' },
    ],
    outputs: [],
  },
] as const

// ── Encryption (server-side or client-side) ──────────────────────────────

/**
 * Read the current Inco operation fee from the Lightning singleton contract.
 */
export async function getIncoFee(): Promise<bigint> {
  const { createPublicClient, http } = await import('viem')
  const { base } = await import('viem/chains')

  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  })

  return publicClient.readContract({
    address: INCO_LIGHTNING_ADDRESS,
    abi: INCO_LIGHTNING_ABI,
    functionName: 'getFee',
  }) as Promise<bigint>
}

/**
 * Split a UTF-8 string into chunks that fit in one euint256 plaintext (≤31 bytes).
 */
export function chunkUtf8(data: string, chunkSize = INCO_CHUNK_BYTES): Uint8Array[] {
  const bytes = new TextEncoder().encode(data)
  const chunks: Uint8Array[] = []
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(bytes.slice(i, i + chunkSize))
  }
  if (chunks.length === 0) {
    chunks.push(new Uint8Array())
  }
  return chunks
}

async function encryptBytesChunk(
  bytes: Uint8Array,
  storerAddress: string,
  vaultAddress: `0x${string}`
): Promise<HexString> {
  const zap = await getIncoLightning()
  const { handleTypes } = await import('@inco/lightning-js')
  const value = bytesToBigInt(bytes)

  return zap.encrypt(value, {
    accountAddress: storerAddress,
    dappAddress: vaultAddress,
    handleType: handleTypes.euint256,
  })
}

/**
 * Encrypt a secret panel payload for on-chain storage.
 * Large JSON is split into multiple ciphertext chunks (31 bytes each).
 */
export async function encryptSecretPanel(
  data: string,
  storerAddress: string
): Promise<HexString[]> {
  const vaultAddress = getVaultAddress()
  const chunks = chunkUtf8(data)
  const ciphertexts: HexString[] = []

  for (const chunk of chunks) {
    ciphertexts.push(await encryptBytesChunk(chunk, storerAddress, vaultAddress))
  }

  return ciphertexts
}

/**
 * Encrypt a Wordle answer for on-chain storage.
 *
 * @param answer - The Wordle answer word (uppercase)
 * @param storerAddress - The address storing the answer
 * @returns The ciphertext as a hex string
 */
export async function encryptWordleAnswer(
  answer: string,
  storerAddress: string
): Promise<HexString> {
  const vaultAddress = getVaultAddress()
  const bytes = new TextEncoder().encode(answer.toUpperCase())
  return encryptBytesChunk(bytes, storerAddress, vaultAddress)
}

// ── Decryption (client-side, requires wallet) ────────────────────────────

/**
 * Decrypt a secret panel handle using the NFT holder's wallet.
 *
 * The caller must be the NFT owner — Inco's covalidators enforce the
 * access control set by `e.allow(handle, owner)` in the contract.
 *
 * @param handle - The euint256 handle (bytes32) from SecretPanelVault.getSecretPanelHandle()
 * @param walletClient - The connected wallet client (from wagmi useWalletClient)
 * @returns The decrypted secret panel JSON string
 */
export async function decryptSecretPanel(
  handles: HexString | HexString[],
  walletClient: WalletClient<Transport, Chain, Account>
): Promise<string | null> {
  const handleList = Array.isArray(handles) ? handles : [handles]

  try {
    const zap = await getIncoLightning()
    const results = await zap.attestedDecrypt(walletClient, handleList)
    const parts: Uint8Array[] = []

    for (const result of results) {
      const plaintext = result?.plaintext?.value
      if (typeof plaintext !== 'bigint') {
        console.error('[Inco] Decrypt returned non-bigint value:', plaintext)
        return null
      }
      parts.push(bigIntToUint8Array(plaintext))
    }

    const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const part of parts) {
      combined.set(part, offset)
      offset += part.length
    }

    return new TextDecoder().decode(combined)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Inco] Failed to decrypt secret panel:', msg)
    if (msg.includes('access') || msg.includes('allow') || msg.includes('permission')) {
      throw new Error(
        `Inco access denied — you may not have decryption rights for this handle. (${msg})`
      )
    }
    return null
  }
}

/**
 * Decrypt a Wordle answer handle.
 *
 * @param handle - The euint256 handle from SecretPanelVault.getWordleAnswerHandle()
 * @param walletClient - The connected wallet client
 * @returns The decrypted answer string
 */
export async function decryptWordleAnswer(
  handle: HexString,
  walletClient: WalletClient<Transport, Chain, Account>
): Promise<string | null> {
  try {
    const zap = await getIncoLightning()
    const results = await zap.attestedDecrypt(walletClient, [handle])
    const plaintext = results[0]?.plaintext?.value
    if (typeof plaintext !== 'bigint') {
      console.error('[Inco] Decrypt returned non-bigint value:', plaintext)
      return null
    }
    return bigIntToBytes(plaintext)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Inco] Failed to decrypt Wordle answer:', msg)
    if (msg.includes('access') || msg.includes('allow') || msg.includes('permission')) {
      throw new Error(
        `Inco access denied — you may not have decryption rights for this handle. (${msg})`
      )
    }
    return null
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────

/**
 * Convert a Uint8Array to a bigint (big-endian).
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i])
  }
  return result
}

function bigIntToUint8Array(value: bigint): Uint8Array {
  if (value === 0n) return new Uint8Array()
  const hex = value.toString(16)
  const paddedHex = hex.length % 2 === 0 ? hex : '0' + hex
  const bytes = new Uint8Array(paddedHex.length / 2)
  for (let i = 0; i < paddedHex.length; i += 2) {
    bytes[i / 2] = parseInt(paddedHex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Convert a bigint back to a UTF-8 string (big-endian).
 */
function bigIntToBytes(value: bigint): string {
  return new TextDecoder().decode(bigIntToUint8Array(value))
}

/**
 * Format a handle (bytes32 returned from contract) as a hex string
 * suitable for the Inco SDK's attestedDecrypt.
 */
export function formatHandle(handle: string): HexString {
  // Handle may come as a 0x-prefixed hex string from contract read
  if (handle.startsWith('0x')) {
    return handle as HexString
  }
  return `0x${handle}` as HexString
}
