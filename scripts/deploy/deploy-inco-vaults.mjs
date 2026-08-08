import fs from 'node:fs'
import path from 'node:path'
import { createPublicClient, createWalletClient, http, keccak256, parseAbi, toBytes } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const root = process.cwd()
const envPath = process.env.DEPLOY_ENV_FILE || '.env.local'
const fileVars = fs.existsSync(envPath)
  ? Object.fromEntries(
      fs
        .readFileSync(envPath, 'utf8')
        .split(/\n/)
        .map((line) => {
          const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
          if (!match) return null
          return [match[1], match[2].trim().replace(/^["']|["']$/g, '')]
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

const gameNFT =
  vars.NEXT_PUBLIC_GAME_NFT_MAINNET ||
  vars.NEXT_PUBLIC_GAME_NFT_ADDRESS ||
  '0x32D0356f533cC429F94Db73f383bBb21a459E16b'

const secretPanelArtifact = JSON.parse(
  fs.readFileSync(path.join(root, 'contracts/out/SecretPanelVault.sol/SecretPanelVault.json'), 'utf8')
)
const dailyChallengeArtifact = JSON.parse(
  fs.readFileSync(path.join(root, 'contracts/out/DailyChallengeVault.sol/DailyChallengeVault.json'), 'utf8')
)

const accessControlAbi = parseAbi([
  'function grantRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
])

const vaultManagerRole = keccak256(toBytes('VAULT_MANAGER_ROLE'))
const sessionManagerRole = keccak256(toBytes('SESSION_MANAGER_ROLE'))

async function wait(hash, label) {
  console.log(`${label}_TX=${hash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error(`${label} failed: ${hash}`)
  return receipt
}

console.log(`DEPLOYER=${deployer.address}`)
console.log(`NARRATIVE_OPERATOR=${manager.address}`)
console.log(`GAME_NFT=${gameNFT}`)
console.log(`BASE_ETH_BEFORE=${Number(await publicClient.getBalance({ address: deployer.address })) / 1e18}`)

const secretPanelReceipt = await wait(
  await walletClient.deployContract({
    abi: secretPanelArtifact.abi,
    bytecode: secretPanelArtifact.bytecode.object,
    args: [deployer.address, gameNFT],
  }),
  'SECRET_PANEL_VAULT_DEPLOY'
)
const secretPanelVault = secretPanelReceipt.contractAddress
console.log(`SECRET_PANEL_VAULT=${secretPanelVault}`)

const dailyReceipt = await wait(
  await walletClient.deployContract({
    abi: dailyChallengeArtifact.abi,
    bytecode: dailyChallengeArtifact.bytecode.object,
    args: [deployer.address, manager.address],
  }),
  'DAILY_CHALLENGE_VAULT_DEPLOY'
)
const dailyChallengeVault = dailyReceipt.contractAddress
console.log(`DAILY_CHALLENGE_VAULT=${dailyChallengeVault}`)

if (manager.address.toLowerCase() !== deployer.address.toLowerCase()) {
  await wait(
    await walletClient.writeContract({
      address: secretPanelVault,
      abi: accessControlAbi,
      functionName: 'grantRole',
      args: [vaultManagerRole, manager.address],
    }),
    'GRANT_VAULT_MANAGER'
  )

  await wait(
    await walletClient.writeContract({
      address: dailyChallengeVault,
      abi: accessControlAbi,
      functionName: 'grantRole',
      args: [sessionManagerRole, manager.address],
    }),
    'GRANT_SESSION_MANAGER'
  )
}

console.log(`VERIFY_VAULT_MANAGER=${await publicClient.readContract({
  address: secretPanelVault,
  abi: accessControlAbi,
  functionName: 'hasRole',
  args: [vaultManagerRole, manager.address],
})}`)
console.log(`VERIFY_SESSION_MANAGER=${await publicClient.readContract({
  address: dailyChallengeVault,
  abi: accessControlAbi,
  functionName: 'hasRole',
  args: [sessionManagerRole, manager.address],
})}`)
console.log(`BASE_ETH_AFTER=${Number(await publicClient.getBalance({ address: deployer.address })) / 1e18}`)

console.log('\n--- Add to .env.local / Vercel ---')
console.log(`NEXT_PUBLIC_SECRET_PANEL_VAULT_ADDRESS="${secretPanelVault}"`)
console.log(`NEXT_PUBLIC_DAILY_CHALLENGE_VAULT_ADDRESS="${dailyChallengeVault}"`)
console.log('FEATURE_INCO="true"')
console.log('FEATURE_DAILY_CHALLENGE="true"')
