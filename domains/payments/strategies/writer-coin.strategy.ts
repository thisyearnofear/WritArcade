import { encodeFunctionData } from 'viem'
import type { PaymentStrategy, ExecutePaymentParams } from './payment-strategy'
import { getPaymentTokenConfig } from '@/lib/writerCoins'
import { BASE_MAINNET_CHAIN_ID } from '@/lib/chains'

function encodeERC20Approval(
  spenderAddress: `0x${string}`,
  amount: string
): `0x${string}` {
  const selector = '0x095ea7b3'
  const encodedSpender = spenderAddress.slice(2).padStart(64, '0')
  const amountBigInt = BigInt(amount)
  const encodedAmount = amountBigInt.toString(16).padStart(64, '0')
  
  return (selector + encodedSpender + encodedAmount) as `0x${string}`
}

export class WriterCoinStrategy implements PaymentStrategy {
  id = 'writercoin'
  name = 'WriterCoin (Base)'
  chainId = BASE_MAINNET_CHAIN_ID

  async executePayment({ walletClient, userAddress, token, action }: ExecutePaymentParams): Promise<string> {
    if (token.type !== 'writercoin') {
      throw new Error('Invalid token type for WriterCoinStrategy')
    }

    const writerCoin = token.coin

    // 1. Initiate via backend
    const initiateResponse = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writerCoinId: writerCoin.id,
        action,
      }),
    })

    if (!initiateResponse.ok) {
      const errorData = await initiateResponse.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to initiate payment (${initiateResponse.status})`)
    }

    const paymentInfo = await initiateResponse.json()
    const contractAddress = paymentInfo.contractAddress as `0x${string}`
    const paymentAmount = paymentInfo.amount as string

    if (!contractAddress) {
      throw new Error('Invalid contract address received from server')
    }

    // 2. Approve ERC20
    try {
      const approvalTx = await walletClient.writeContract({
        address: writerCoin.address,
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }],
        functionName: 'approve',
        args: [contractAddress, BigInt(paymentAmount)],
        account: userAddress as `0x${string}`,
        chain: null
      })
      console.log('[WriterCoinStrategy] Approval transaction sent:', approvalTx)
    } catch (approvalErr) {
      console.warn('[WriterCoinStrategy] Approval error (continuing):', approvalErr)
    }

    // 3. Execute Payment Contract
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: action === 'generate-game' 
        ? [{ 
            name: 'payForGameGeneration', 
            type: 'function', 
            stateMutability: 'nonpayable', 
            inputs: [{ name: 'writerCoin', type: 'address' }],
            outputs: []
          }]
        : [{ 
            name: 'payAndMintGame', 
            type: 'function', 
            stateMutability: 'nonpayable', 
            inputs: [
              { name: 'writerCoin', type: 'address' }, 
              { name: 'tokenURI', type: 'string' }
            ],
            outputs: []
          }],
      functionName: action === 'generate-game' ? 'payForGameGeneration' : 'payAndMintGame',
      args: action === 'generate-game' ? [writerCoin.address] : [writerCoin.address, 'demo'],
      account: userAddress as `0x${string}`,
      chain: null
    })

    console.log('[WriterCoinStrategy] Transaction sent:', txHash)

    // 4. Verify via backend
    const verifyResponse = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionHash: txHash,
        writerCoinId: writerCoin.id,
        action,
      }),
    })

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to verify payment (${verifyResponse.status})`)
    }

    return txHash
  }
}
