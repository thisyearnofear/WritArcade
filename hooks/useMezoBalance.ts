'use client'

import { useReadContract } from 'wagmi'
import { useAccount } from 'wagmi'
import { MEZO_CONFIG } from '@/lib/writerCoins'
import { MEZO_TESTNET_CHAIN_ID } from '@/lib/chains'

const ERC20_BALANCE_OF_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const

/**
 * Read the connected wallet's MEZO balance from the Mezo Matsnet (testnet).
 *
 * Returns the raw wei balance plus a derived `isHolder` flag based on
 * `MEZO_CONFIG.holderThreshold` and a formatted human string.
 *
 * Reads on-chain via wagmi/viem (no server roundtrip required since MEZO is
 * a public ERC-20). For mainnet rollout, switch chainId to 31612.
 */
export function useMezoBalance() {
  const { address, isConnected } = useAccount()

  const { data, isLoading, error, refetch } = useReadContract({
    address: MEZO_CONFIG.address,
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
  const isHolder = balance >= MEZO_CONFIG.holderThreshold
  const formatted = (Number(balance) / 10 ** MEZO_CONFIG.decimals).toFixed(2)

  return {
    balance,
    formatted,
    isHolder,
    isLoading,
    error: error ? error.message : null,
    refresh: refetch,
  }
}
