'use client'

import { useReadContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { MUSD_CONFIG } from '@/lib/writer-coins'
import { MEZO_TESTNET_CHAIN_ID } from '@/lib/wallet/chains'

const ERC20_BALANCE_OF_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const

/**
 * Read the connected wallet's MUSD balance from the Mezo Matsnet (testnet).
 *
 * Uses the public MUSD token address and reads on-chain via wagmi/viem.
 */
export function useMUSDBalance() {
  const { address, isConnected } = useAccount()

  const { data, isLoading, error, refetch } = useReadContract({
    address: MUSD_CONFIG.testnet.address,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: MEZO_TESTNET_CHAIN_ID,
    query: {
      enabled: Boolean(address && isConnected),
      staleTime: 60_000,
    },
  })

  const balance = (data as bigint | undefined) ?? 0n
  const formatted = (Number(balance) / 10 ** MUSD_CONFIG.testnet.decimals).toFixed(4)

  return {
    balance,
    formatted,
    isLoading,
    error: error ? error.message : null,
    refresh: refetch,
  }
}
