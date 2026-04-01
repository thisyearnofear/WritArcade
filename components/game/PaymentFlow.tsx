'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { encodeFunctionData, toHex } from 'viem'
import { type WriterCoin } from '@/lib/writerCoins'
import type { PaymentAction } from '@/domains/payments/types'
import { ErrorCard } from '@/components/error/ErrorCard'
import { getUserMessage, retryWithBackoff } from '@/lib/error-handler'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { Loader2, Wallet } from 'lucide-react'

interface PaymentFlowProps {
  writerCoin: WriterCoin
  action: PaymentAction
  costFormatted: string
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
}

const BASE_CHAIN_ID = 8453

export function PaymentFlow({
  writerCoin,
  action,
  costFormatted,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
}: PaymentFlowProps) {
  const { address: userAddress, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  const { balance, isLoading: isLoadingBalance, error: balanceError, refresh } = useWriterCoinBalance(writerCoin.id)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredAmount = useMemo(() => {
    const cost = action === 'generate-game' ? writerCoin.gameGenerationCost : writerCoin.mintCost
    return Number(cost) / 10 ** writerCoin.decimals
  }, [writerCoin, action])

  const userBalance = useMemo(() => {
    if (!balance?.formattedBalance) return null
    return parseFloat(balance.formattedBalance)
  }, [balance])

  const hasInsufficientBalance = useMemo(() => {
    if (userBalance === null || isLoadingBalance) return false
    return userBalance < requiredAmount
  }, [userBalance, requiredAmount, isLoadingBalance])

  const handlePayment = useCallback(async () => {
    if (!walletClient || !userAddress) {
      setError('Wallet not available. Please make sure your wallet is connected.')
      return
    }

    if (hasInsufficientBalance) {
      setError(`Insufficient ${writerCoin.symbol} balance. You need ${requiredAmount} ${writerCoin.symbol} but have ${userBalance} ${writerCoin.symbol}.`)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await retryWithBackoff(
        async () => {
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
            throw new Error(
              errorData.error || 
              `Failed to initiate payment (${initiateResponse.status})`
            )
          }

          const paymentInfo = await initiateResponse.json()
          const contractAddress = paymentInfo.contractAddress as `0x${string}`
          const amount = paymentInfo.amount as string

          if (!contractAddress) {
            throw new Error('Invalid contract address received from server')
          }

          const approvalData = encodeERC20Approval(contractAddress, amount)
          
          try {
            const approvalTx = await walletClient.writeContract({
              address: writerCoin.address,
              abi: ['function approve(address spender, uint256 amount) returns (bool)'],
              functionName: 'approve',
              args: [contractAddress as `0x${string}`, BigInt(amount)],
            })

            console.log('[PaymentFlow] Approval transaction sent:', approvalTx)
          } catch (approvalErr) {
            console.warn('[PaymentFlow] Approval error (continuing):', approvalErr)
            const errorMessage = String(approvalErr)
            if (errorMessage.includes('already approved') || errorMessage.includes('allowance sufficient')) {
              console.log('[PaymentFlow] Token already approved, proceeding with payment')
            }
          }

          let transactionData: `0x${string}`

          if (action === 'generate-game') {
            transactionData = encodeFunctionData({
              abi: [{
                name: 'payForGameGeneration',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [{ name: 'writerCoin', type: 'address' }]
              }],
              functionName: 'payForGameGeneration',
              args: [writerCoin.address]
            })
          } else {
            transactionData = encodeFunctionData({
              abi: [{
                name: 'payAndMintGame',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                  { name: 'writerCoin', type: 'address' },
                  { name: 'tokenURI', type: 'string' }
                ]
              }],
              functionName: 'payAndMintGame',
              args: [writerCoin.address, 'demo']
            })
          }

          const txRequest = {
            to: contractAddress,
            data: transactionData,
            chainId: BASE_CHAIN_ID,
          }

          console.log('[PaymentFlow] Sending transaction to:', contractAddress)
          console.log('[PaymentFlow] Writer coin:', writerCoin.address)
          console.log('[PaymentFlow] User address:', userAddress)

          const txHash = await walletClient.writeContract({
            address: contractAddress,
            abi: action === 'generate-game' 
              ? [{ name: 'payForGameGeneration', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'writerCoin', type: 'address' }] }]
              : [{ name: 'payAndMintGame', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'writerCoin', type: 'address' }, { name: 'tokenURI', type: 'string' }] }],
            functionName: action === 'generate-game' ? 'payForGameGeneration' : 'payAndMintGame',
            args: action === 'generate-game' ? [writerCoin.address] : [writerCoin.address, 'demo'],
          })

          console.log('[PaymentFlow] Transaction sent:', txHash)

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
            throw new Error(
              errorData.error || 
              `Failed to verify payment (${verifyResponse.status})`
            )
          }

          return txHash
        },
        2,
        1500
      ).then((txHash) => {
        refresh()
        onPaymentSuccess?.(txHash)
      })
    } catch (err) {
      const message = getUserMessage(err)
      setError(message)
      onPaymentError?.(message)
      console.error('[PaymentFlow] Error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [walletClient, userAddress, writerCoin, action, hasInsufficientBalance, userBalance, requiredAmount, onPaymentSuccess, onPaymentError, refresh])

  const actionLabel =
    action === 'generate-game'
      ? `Generate Game (${costFormatted} ${writerCoin.symbol})`
      : `Mint as NFT (${costFormatted} ${writerCoin.symbol})`

  const isWrongChain = Boolean(chainId && chainId !== BASE_CHAIN_ID)

  return (
    <div className="space-y-3">
      {userAddress && (
        <div className="rounded-lg bg-purple-900/20 border border-purple-500/30 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" />
              <span className="text-purple-200">Your Balance:</span>
            </div>
            <div className="flex items-center gap-2">
              {isLoadingBalance ? (
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              ) : balanceError ? (
                <span className="text-red-400">Unable to load</span>
              ) : (
                <>
                  <span className={`font-semibold ${hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}`}>
                    {balance ? balance.formattedBalance : '0'} {writerCoin.symbol}
                  </span>
                  {hasInsufficientBalance && (
                    <span className="text-xs text-red-400">(Insufficient)</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={disabled || isProcessing || !walletClient || !userAddress || !!isLoadingBalance || hasInsufficientBalance || isWrongChain}
        className="w-full rounded-lg bg-purple-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing payment...
          </span>
        ) : isWrongChain ? (
          <span>Switch to Base Network</span>
        ) : (
          actionLabel
        )}
      </button>

      {error && <ErrorCard error={error} onDismiss={() => setError(null)} />}

      <div className="rounded-lg bg-purple-900/30 p-3 text-xs text-purple-300">
        <p>
          💡 <span className="font-semibold">Payment flow:</span> You'll approve spending in your wallet, then we process your payment on Base.
        </p>
      </div>
    </div>
  )
}

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