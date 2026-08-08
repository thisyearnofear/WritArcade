import fs from 'node:fs'
import path from 'node:path'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const root = process.cwd()
const envPath = process.env.DEPLOY_ENV_FILE || '.env.local'
const fileVars = fs.existsSync(envPath)
  ? Object.fromEntries(fs.readFileSync(envPath, 'utf8').split(/\n/).map(line => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) return null
    return [match[1], match[2].trim().replace(/^["']|["']$/g, '')]
  }).filter(Boolean))
  : {}
const vars = { ...process.env, ...fileVars }

const privateKey = vars.STORY_PLATFORM_PRIVATE_KEY || vars.MEZO_DEPLOYER_PRIVATE_KEY
if (!privateKey) throw new Error('Missing deployment private key')

const account = privateKeyToAccount(privateKey)
const rpcUrl = vars.BASE_RPC_URL || 'https://mainnet.base.org'
const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) })

const platformTreasury = vars.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS || vars.PLATFORM_TREASURY_ADDRESS || account.address
const creatorPool = vars.CREATOR_POOL_ADDRESS || platformTreasury
const royaltyReceiver = platformTreasury
const royaltyFeeNumerator = 500n

const gameArtifact = JSON.parse(fs.readFileSync(path.join(root, 'contracts/out/GameNFT.sol/GameNFT.json'), 'utf8'))
const paymentArtifact = JSON.parse(fs.readFileSync(path.join(root, 'contracts/out/WriterCoinPayment.sol/WriterCoinPayment.json'), 'utf8'))

const writerCoins = [
  { id: 'avc', address: '0x06FC3D5D2369561e28F261148576520F5e49D6ea', treasury: '0x1017aC960508d955E30dECa7fe9216BddA777B20' },
  { id: 'debbie', address: '0x4ea5d3ff9e8295a552903d4bd486ce8cf8291c60', treasury: '0xA9F7c123CB756aF83d79AD02A216DC7606B8e58A' },
  { id: 'jake', address: '0xC2E3A4d07fdff60f3CdCb39FD94Fc11F254938B9', treasury: '0x5baA44bb6B7bd79C89628696F1186bCaEb3453AA' },
  { id: 'tso', address: '0x98cacf94eb68ea4c5bdc4d70a1a04c2c2cffde39', treasury: '0xf6D4e5A63A7C42EBF639B6AFB9613E8eFcA1C7DA' },
  { id: 'papa', address: '0x300efb94e4a7fcf71184eeeb82cb2b7af4a6ea58', treasury: '0x55A5705453Ee82c742274154136Fce8149597058' },
]

const generationCost = 100000000000000000000n
const mintCost = 50000000000000000000n
const minterRole = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'

async function wait(hash, label) {
  console.log(`${label}_TX=${hash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error(`${label} failed: ${hash}`)
  return receipt
}

console.log(`DEPLOYER=${account.address}`)
console.log(`PLATFORM_TREASURY=${platformTreasury}`)
console.log(`CREATOR_POOL=${creatorPool}`)
console.log(`BASE_ETH_BEFORE=${Number(await publicClient.getBalance({ address: account.address })) / 1e18}`)

const gameReceipt = await wait(await walletClient.deployContract({
  abi: gameArtifact.abi,
  bytecode: gameArtifact.bytecode.object,
  args: [account.address, '', royaltyReceiver, royaltyFeeNumerator],
}), 'GAME_NFT_DEPLOY')
const gameNFT = gameReceipt.contractAddress
console.log(`GAME_NFT=${gameNFT}`)

const paymentReceipt = await wait(await walletClient.deployContract({
  abi: paymentArtifact.abi,
  bytecode: paymentArtifact.bytecode.object,
  args: [account.address, platformTreasury, creatorPool, gameNFT],
}), 'WRITER_COIN_PAYMENT_DEPLOY')
const payment = paymentReceipt.contractAddress
console.log(`WRITER_COIN_PAYMENT=${payment}`)

const gameAbi = parseAbi([
  'function grantRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
])
const paymentAbi = parseAbi([
  'function whitelistCoin(address coinAddress,uint256 gameGenerationCost,uint256 mintCost,address treasury,uint256 writerShare,uint256 platformShare,uint256 creatorPoolShare,uint256 mintCreatorShare,uint256 mintWriterShare,uint256 mintPlatformShare,uint256 playCreatorShare,uint256 playWriterShare,uint256 playPlatformShare)',
  'function isCoinWhitelisted(address coinAddress) view returns (bool)',
  'function gameNFT() view returns (address)',
])

await wait(await walletClient.writeContract({
  address: gameNFT,
  abi: gameAbi,
  functionName: 'grantRole',
  args: [minterRole, payment],
}), 'GRANT_MINTER_ROLE')

for (const coin of writerCoins) {
  await wait(await walletClient.writeContract({
    address: payment,
    abi: paymentAbi,
    functionName: 'whitelistCoin',
    args: [
      coin.address,
      generationCost,
      mintCost,
      coin.treasury,
      6000n,
      2000n,
      2000n,
      5000n,
      1500n,
      500n,
      8000n,
      1000n,
      1000n,
    ],
  }), `WHITELIST_${coin.id.toUpperCase()}`)
}

console.log(`VERIFY_PAYMENT_GAME_NFT=${await publicClient.readContract({ address: payment, abi: paymentAbi, functionName: 'gameNFT' })}`)
console.log(`VERIFY_PAYMENT_HAS_MINTER=${await publicClient.readContract({ address: gameNFT, abi: gameAbi, functionName: 'hasRole', args: [minterRole, payment] })}`)
for (const coin of writerCoins) {
  console.log(`VERIFY_${coin.id.toUpperCase()}_WHITELISTED=${await publicClient.readContract({ address: payment, abi: paymentAbi, functionName: 'isCoinWhitelisted', args: [coin.address] })}`)
}
console.log(`BASE_ETH_AFTER=${Number(await publicClient.getBalance({ address: account.address })) / 1e18}`)
