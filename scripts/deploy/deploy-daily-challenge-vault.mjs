#!/usr/bin/env node
/**
 * Focused redeploy of DailyChallengeVault only (hardened deck-cycle version).
 *
 * Does NOT touch SecretPanelVault — that contract stays at its existing
 * address to preserve stored secret panels / Wordle answers.
 *
 * Usage:
 *   node scripts/deploy/deploy-daily-challenge-vault.mjs           # real deploy
 *   DEPLOY_ENV_FILE=.env.local node scripts/deploy/deploy-daily-challenge-vault.mjs
 *   node scripts/deploy/deploy-daily-challenge-vault.mjs --dry-run # simulate, no tx
 *
 * Narrative operator / session manager = the "manager" wallet. When no
 * INCO_VAULT_MANAGER_PRIVATE_KEY / DAILY_CHALLENGE_MANAGER_PRIVATE_KEY is set,
 * this falls back to the deployer key (matching the existing vault's
 * narrativeOperator), so the backend's Inco decrypt continues to work.
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  createPublicClient,
  createWalletClient,
  http,
  getContractAddress,
  keccak256,
  parseAbi,
  toBytes,
} from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const root = process.cwd()
const dryRun = process.argv.includes('--dry-run')

const envPath = process.env.DEPLOY_ENV_FILE || '.env.local'
const fileVars = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs
        .readFileSync(envPath, 'utf8')
        .split('\n')
        .map((line) => {
          const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
          if (!m) return null
          return [m[1], m[2].trim().replace(/^["']|["']$/g, '')]
        })
        .filter(Boolean)
    )
  : {}
const vars = { ...process.env, ...fileVars }

const deployerKey = vars.MEZO_DEPLOYER_PRIVATE_KEY || vars.STORY_PLATFORM_PRIVATE_KEY
const managerKey =
  vars.INCO_VAULT_MANAGER_PRIVATE_KEY ||
  vars.DAILY_CHALLENGE_MANAGER_PRIVATE_KEY ||
  vars.STORY_PLATFORM_PRIVATE_KEY ||
  deployerKey

if (!deployerKey) throw new Error('Missing MEZO_DEPLOYER_PRIVATE_KEY or STORY_PLATFORM_PRIVATE_KEY')
if (!managerKey) throw new Error('Missing manager private key for narrative operator')

const deployer = privateKeyToAccount(deployerKey)
const manager = privateKeyToAccount(managerKey)
const rpcUrl = vars.BASE_RPC_URL || vars.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account: deployer, chain: base, transport: http(rpcUrl) })

const artifact = JSON.parse(
  fs.readFileSync(path.join(root, 'contracts/out/DailyChallengeVault.sol/DailyChallengeVault.json'), 'utf8')
)

const sessionManagerRole = keccak256(toBytes('SESSION_MANAGER_ROLE'))

console.log('DRY_RUN=', dryRun)
console.log('DEPLOYER=', deployer.address)
console.log('NARRATIVE_OPERATOR=', manager.address)
console.log('BASE_ETH_BEFORE=', Number(await publicClient.getBalance({ address: deployer.address })) / 1e18)

const deployArgs = [deployer.address, manager.address]

async function predictAddress() {
  const nonce = await publicClient.getTransactionCount({ address: deployer.address })
  return getContractAddress({ from: deployer.address, nonce })
}

if (dryRun) {
  const predicted = await predictAddress()
  console.log('DRY_RUN_PREDICTED_ADDRESS=', predicted)
  const { encodeDeployData } = await import('viem')
  const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode.object, args: deployArgs })
  const gas = await publicClient.estimateGas({ account: deployer.address, data })
  const feeData = await publicClient.estimateFeesPerGas()
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas
  const estCost = (BigInt(gas) * gasPrice) / 10n ** 18n
  console.log('DRY_RUN_EST_GAS=', String(gas))
  console.log('DRY_RUN_EST_COST_ETH=', Number(estCost))
  console.log('DRY_RUN_ABI_HAS_getStartSessionFee=', artifact.abi.some((f) => f.name === 'getStartSessionFee'))
  console.log('Dry run complete — no transaction sent.')
  process.exit(0)
}

const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode.object,
  args: deployArgs,
})
console.log('DAILY_CHALLENGE_VAULT_DEPLOY_TX=', hash)
const receipt = await publicClient.waitForTransactionReceipt({ hash })
if (receipt.status !== 'success') throw new Error(`Deploy failed: ${hash}`)
const vaultAddress = receipt.contractAddress
console.log('DAILY_CHALLENGE_VAULT=', vaultAddress)

// Verify roles + narrative operator on the freshly deployed vault.
const abi = parseAbi([
  'function narrativeOperator() view returns (address)',
  'function hasRole(bytes32,address) view returns (bool)',
  'function getStartSessionFee(uint256) view returns (uint256)',
  'function getChallengeStats(uint256) view returns (uint256,uint256,bool)',
])
console.log('VERIFY_narrativeOperator=', await publicClient.readContract({ address: vaultAddress, abi, functionName: 'narrativeOperator' }))
console.log(
  'VERIFY_deployer_has_SESSION_MANAGER=',
  await publicClient.readContract({ address: vaultAddress, abi, functionName: 'hasRole', args: [sessionManagerRole, deployer.address] })
)

console.log('BASE_ETH_AFTER=', Number(await publicClient.getBalance({ address: deployer.address })) / 1e18)
console.log('\n--- Update env (local + Vercel) ---')
console.log(`NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS="${vaultAddress}"`)
console.log('Deploy transaction hashes (for deploy.md):')
console.log(`- DailyChallengeVault deploy: ${hash}`)