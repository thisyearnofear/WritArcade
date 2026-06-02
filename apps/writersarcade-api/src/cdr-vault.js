'use strict'

/**
 * CDR Vault — server-side vault operations for Story Confidential Data Rails.
 *
 * Uses uploadCDR (on-chain storage) — no IPFS provider needed.
 * WASM loaded lazily on first request. Platform client cached as singleton.
 * Circuit breaker prevents cascading CDR API failures.
 * Uses dynamic import() for ESM-only @piplabs/cdr-sdk in CJS runtime.
 *
 * ENV: STORY_PLATFORM_PRIVATE_KEY (required), STORY_RPC_URL, CDR_API_URL
 */

const { createPublicClient, createWalletClient, http } = require('viem')
const { privateKeyToAccount } = require('viem/accounts')

// ── Aeneid Testnet Constants ────────────────────────────────────────────
const OWNER_WRITE_CONDITION_ADDR = '0x4C9bFC96d7092b590D497A191826C3dA2277c34B'
const LICENSE_READ_CONDITION_ADDR = '0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3'
const STORY_RPC_URL = process.env.STORY_RPC_URL || 'https://aeneid.storyrpc.io'
// Story-API REST endpoint for DKG state (NOT the EVM RPC)
const STORY_REST_URL = process.env.CDR_API_URL

const STORY_CHAIN = {
  id: 1315,
  name: 'Story Aeneid',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [STORY_RPC_URL] } },
}

// ── Lazy State ──────────────────────────────────────────────────────────
let wasmInitialised = false
let platformClient = null
let platformAccount = null

// ── Circuit Breaker ─────────────────────────────────────────────────────
const breaker = { failures: 0, lastFailure: 0, isOpen: false }
const THRESHOLD = 5
const TIMEOUT = 30_000

function isReady () {
  if (!breaker.isOpen) return true
  if (Date.now() - breaker.lastFailure > TIMEOUT) {
    breaker.isOpen = false; breaker.failures = 0
    return true
  }
  return false
}
function recordFailure () {
  breaker.failures++; breaker.lastFailure = Date.now()
  if (breaker.failures >= THRESHOLD) breaker.isOpen = true
}
function recordSuccess () { breaker.failures = 0; breaker.isOpen = false }

// ── Initialisation ──────────────────────────────────────────────────────

/**
 * Ensure CDR WASM is loaded. Safe to call multiple times — only inits once.
 */
async function ensureWasm () {
  if (wasmInitialised) return true
  try {
    const { initWasm } = await import('@piplabs/cdr-sdk')
    await initWasm()
    wasmInitialised = true
    return true
  } catch (err) {
    console.error('[cdr-vault] WASM init failed:', err.message)
    return false
  }
}

/**
 * Get or create the platform CDR client singleton.
 * Lazy-loads WASM + SDK on first call.
 */
async function getPlatformClient () {
  if (platformClient && platformAccount) {
    return { client: platformClient, account: platformAccount }
  }

  const privateKey = process.env.STORY_PLATFORM_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('STORY_PLATFORM_PRIVATE_KEY is not configured')
  }

  const wasmOk = await ensureWasm()
  if (!wasmOk) throw new Error('CDR WASM module failed to initialise')

  const account = privateKeyToAccount(privateKey)
  platformAccount = account

  const transport = http(STORY_RPC_URL)
  const publicClient = createPublicClient({ chain: STORY_CHAIN, transport })
  const walletClient = createWalletClient({ account, chain: STORY_CHAIN, transport })

  const { CDRClient } = await import('@piplabs/cdr-sdk')

  platformClient = new CDRClient({
    network: 'testnet',
    publicClient,
    walletClient,
    apiUrl: STORY_REST_URL,
  })

  return { client: platformClient, account: platformAccount }
}

// ── Vault Operation ─────────────────────────────────────────────────────

/**
 * Vault data into a Story CDR vault with specified read condition.
 *
 * @param {string} data              — Content to vault (plain text or JSON)
 * @param {'open'|'tokenGate'} readCondition — Read access policy
 * @param {string} [nftContract]     — Required when readCondition is 'tokenGate'
 * @returns {Promise<{uuid: string}>}
 */
async function vaultData (data, readCondition, nftContract) {
  if (!isReady()) {
    throw new Error('CDR circuit breaker is open — vaulting unavailable')
  }

  const { client, account } = await getPlatformClient()

  const { conditions } = await import('@piplabs/cdr-sdk')

  const writeCond = conditions.ownerOnly({
    address: OWNER_WRITE_CONDITION_ADDR,
    owner: account.address,
  })

  let readCond
  if (readCondition === 'tokenGate') {
    if (!nftContract) {
      throw new Error('nftContract is required for tokenGate read condition')
    }
    readCond = conditions.tokenGate({
      address: LICENSE_READ_CONDITION_ADDR,
      token: nftContract,
      minBalance: 1n,
    })
  } else {
    readCond = conditions.open({
      address: LICENSE_READ_CONDITION_ADDR,
    })
  }

  try {
    // uploadCDR: stores encrypted data directly on-chain (no IPFS needed).
    // Perfect for small payloads like secret panels and Wordle answers.
    const result = await client.uploader.uploadCDR({
      dataKey: new TextEncoder().encode(data),
      updatable: false,
      writeConditionAddr: writeCond.address,
      readConditionAddr: readCond.address,
      writeConditionData: writeCond.conditionData,
      readConditionData: readCond.conditionData,
      accessAuxData: '0x',
    })
    recordSuccess()
    return { uuid: result.uuid.toString() }
  } catch (err) {
    recordFailure()
    throw err
  }
}

module.exports = { vaultData }
