import type { PaymentStrategy, ExecutePaymentParams } from './payment-strategy'
import { getPaymentTokenConfig } from '@/lib/writerCoins'
import { MEZO_TESTNET_CHAIN_ID } from '@/lib/chains'

const ERC20_APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
}] as const

const SPLITTER_PAY_FOR_GENERATION_ABI = [{
  name: 'payForGeneration',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'amount', type: 'uint256' }],
  outputs: [],
}] as const

const SPLITTER_PAY_AND_MINT_ABI = [{
  name: 'payAndMintGame',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'tokenURI', type: 'string' },
    {
      name: 'metadata',
      type: 'tuple',
      components: [
        { name: 'articleUrl', type: 'string' },
        { name: 'creator', type: 'address' },
        { name: 'writerCoin', type: 'address' },
        { name: 'genre', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'gameTitle', type: 'string' },
      ],
    },
  ],
  outputs: [],
}] as const

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/**
 * MUSDStrategy
 *
 * Pays for game generation and minting in MUSD on the Mezo network.
 * Flow:
 *   1. Approve `MezoPaymentSplitter` to spend `amount` of MUSD.
 *   2. Call `payForGeneration(amount)` (or `payAndMintGame(tokenURI, metadata)` for mints).
 *
 * The splitter atomically forwards:
 *   - platformShareBP → platform treasury
 *   - creatorShareBP  → game creator (mints only)
 *   - writerShareBP   → retained for writer claim
 *
 * Splitter source: contracts/src/MezoPaymentSplitter.sol
 */
export class MUSDStrategy implements PaymentStrategy {
  id = 'musd'
  name = 'MUSD (Mezo)'
  chainId = MEZO_TESTNET_CHAIN_ID

  async executePayment({ walletClient, userAddress, token, action, amount }: ExecutePaymentParams): Promise<string> {
    if (token.type !== 'musd') {
      throw new Error('Invalid token type for MUSDStrategy')
    }

    const config = getPaymentTokenConfig(token)
    if (!config || !('paymentSplitter' in config)) {
      throw new Error('Invalid MUSD configuration: missing paymentSplitter')
    }

    const splitter = config.paymentSplitter as `0x${string}`
    const musd = config.address as `0x${string}`
    const sender = userAddress as `0x${string}`
    const amt = BigInt(amount)

    if (splitter === ZERO_ADDRESS) {
      throw new Error('MezoPaymentSplitter is not deployed on this network yet.')
    }

    // 1. Approve splitter to spend MUSD
    const approvalTx = await walletClient.writeContract({
      address: musd,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [splitter, amt],
      account: sender,
      chain: null,
    })
    console.log('[MUSDStrategy] Approval tx:', approvalTx)

    // 2. Execute splitter call
    if (action === 'mint-nft') {
      // payAndMintGame uses a fixed 1 MUSD price encoded in the contract,
      // but we still pass the user's metadata so the on-chain event captures it.
      const tokenURI = `ipfs://writersarcade/mezo-demo-${Date.now()}`
      const metadata = {
        articleUrl: '',
        creator: sender,
        writerCoin: musd, // MUSD acts as the payment identifier on Mezo
        genre: '',
        difficulty: '',
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        gameTitle: 'WritersArcade Game',
      }

      const txHash = await walletClient.writeContract({
        address: splitter,
        abi: SPLITTER_PAY_AND_MINT_ABI,
        functionName: 'payAndMintGame',
        args: [tokenURI, metadata],
        account: sender,
        chain: null,
      })
      console.log('[MUSDStrategy] payAndMintGame tx:', txHash)
      return txHash
    }

    // generate-game / play-wordle → payForGeneration(amount)
    const txHash = await walletClient.writeContract({
      address: splitter,
      abi: SPLITTER_PAY_FOR_GENERATION_ABI,
      functionName: 'payForGeneration',
      args: [amt],
      account: sender,
      chain: null,
    })
    console.log('[MUSDStrategy] payForGeneration tx:', txHash)
    return txHash
  }
}
