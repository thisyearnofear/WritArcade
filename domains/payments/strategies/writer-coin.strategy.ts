import type { PaymentStrategy, ExecutePaymentParams, PaymentResult } from './payment-strategy'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getPaymentTokenConfig } from '@/lib/writer-coins'
import { BASE_MAINNET_CHAIN_ID } from '@/lib/wallet/chains'

export class WriterCoinStrategy implements PaymentStrategy {
  id = 'writercoin'
  name = 'WriterCoin (Base)'
  chainId = BASE_MAINNET_CHAIN_ID

  async executePayment({ walletClient, userAddress, token, action, onStep }: ExecutePaymentParams): Promise<PaymentResult> {
    if (token.type !== 'writercoin') {
      throw new Error('Invalid token type for WriterCoinStrategy')
    }

    const writerCoin = token.coin
    const step = onStep ?? (() => {})

    step('Preparing payment…')

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
    if (!paymentAmount) {
      throw new Error('Invalid payment amount received from server')
    }

    // 2. Approve ERC20
    step('Step 1 of 2: Approve token spend in your wallet…')
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

    // 3. Execute Payment Contract
    step('Step 2 of 2: Confirm payment in your wallet…')
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

    // 4. Verify via backend (with retry — receipt may not be indexed immediately)
    step('Verifying on-chain…')
    const verifyPayload = {
      transactionHash: txHash,
      writerCoinId: writerCoin.id,
      action,
      userAddress,
      chainId: this.chainId,
    }

    let verifyResponse: Response | null = null
    const MAX_VERIFY_ATTEMPTS = 3
    const VERIFY_DELAY_MS = 3000

    for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
      // Wait before verifying to give the chain time to index the receipt
      await new Promise(resolve => setTimeout(resolve, VERIFY_DELAY_MS))

      verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyPayload),
      })

      if (verifyResponse.ok) break

      // If it's a receipt-not-found error and we have retries left, wait and retry
      if (attempt < MAX_VERIFY_ATTEMPTS) {
        const errorData = await verifyResponse.json().catch(() => ({}))
        const isReceiptError = (errorData.error || '').toLowerCase().includes('receipt')
          || (errorData.error || '').toLowerCase().includes('could not be found')
        if (isReceiptError) {
          console.log(`[WriterCoinStrategy] Receipt not found yet, retrying (${attempt}/${MAX_VERIFY_ATTEMPTS})…`)
          step(`Waiting for confirmation (${attempt}/${MAX_VERIFY_ATTEMPTS})…`)
          continue
        }
      }
      break
    }

    if (!verifyResponse || !verifyResponse.ok) {
      const errorData = verifyResponse ? await verifyResponse.json().catch(() => ({})) : {}
      throw new Error(errorData.error || `Failed to verify payment (${verifyResponse?.status || 'no response'})`)
    }

    const verifyResult = await verifyResponse.json().catch(() => ({} as { paymentId?: string; statusCheckUrl?: string }))
    step('Payment complete!')
    return {
      transactionHash: txHash,
      paymentId: verifyResult.paymentId,
      statusCheckUrl: verifyResult.statusCheckUrl,
    }
  }
}
