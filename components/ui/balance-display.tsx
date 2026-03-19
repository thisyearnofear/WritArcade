'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { useAccount } from 'wagmi'
import { Coins, Loader2, ChevronDown } from 'lucide-react'
import { WRITER_COINS } from '@/lib/writerCoins'
import { CopyAddressButton } from '@/components/ui/copy-address-button'

interface BalanceDisplayProps {
  mobileLayout?: boolean
}

interface CoinBalanceRow {
  coin: typeof WRITER_COINS[number]
  balance: ReturnType<typeof useWriterCoinBalance>['balance']
  isLoading: boolean
}

/**
 * Fetch balances for all writer coins by calling the hook per coin.
 * Hooks must be called statically (no dynamic loops), which is fine
 * since the coin list is small and stable.
 */
function useAllWriterCoinBalances(): CoinBalanceRow[] {
  const avc = useWriterCoinBalance('avc')
  const debbie = useWriterCoinBalance('debbie')
  const jake = useWriterCoinBalance('jake')
  const tso = useWriterCoinBalance('tso')
  const papa = useWriterCoinBalance('papa')

  return [
    { coin: WRITER_COINS[0], ...avc },
    { coin: WRITER_COINS[1], ...debbie },
    { coin: WRITER_COINS[2], ...jake },
    { coin: WRITER_COINS[3], ...tso },
    { coin: WRITER_COINS[4], ...papa },
  ]
}

/** Truncate a formatted balance string to a whole number */
function toWholeNumber(formatted: string): string {
  return formatted.split('.')[0] ?? formatted
}

/** Pick the "primary" balance to show on the badge — first non-zero, else AVC */
function getPrimaryBalance(rows: CoinBalanceRow[]) {
  const nonZero = rows.find(r => r.balance && r.balance.formattedBalance !== '0')
  return nonZero ?? rows[0] // fallback to AVC
}

/** Close dropdown on outside click */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, handler])
}

function BalanceRow({ row, mobileLayout }: { row: CoinBalanceRow; mobileLayout: boolean }) {
  const isZero = !row.balance || row.balance.formattedBalance === '0'

  return (
    <div className={`flex items-center justify-between gap-3 ${mobileLayout ? 'py-2.5 px-4' : 'py-2 px-3'}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <Coins className={`w-4 h-4 shrink-0 ${isZero ? 'text-gray-500' : 'text-purple-400'}`} />
        <span className={`text-sm font-medium truncate ${isZero ? 'text-gray-500' : 'text-gray-100'}`}>
          {row.coin.symbol}
        </span>
        <CopyAddressButton
          address={row.coin.address}
          sizeClass="w-3 h-3"
          labelPrefix={`Copy ${row.coin.symbol}`}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {row.isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
        ) : (
          <span className={`text-sm tabular-nums ${isZero ? 'text-gray-600' : 'text-white font-medium'}`}>
            {row.balance ? toWholeNumber(row.balance.formattedBalance) : '—'}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Header balance display showing user's writer coin balances.
 * Shows primary balance in a badge; click/tap to expand all token balances.
 * Only visible when wallet is connected.
 */
export function BalanceDisplay({ mobileLayout = false }: BalanceDisplayProps) {
  const { isConnected } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allBalances = useAllWriterCoinBalances()

  const close = useCallback(() => setIsOpen(false), [])
  useClickOutside(containerRef, close)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  if (!isConnected) {
    return null
  }

  const primary = getPrimaryBalance(allBalances)
  const primaryIsLoading = primary.isLoading
  const hasPrimaryBalance = primary.balance && primary.balance.formattedBalance !== '0'
  const nonZeroCount = allBalances.filter(r => r.balance && r.balance.formattedBalance !== '0').length

  const badgeBaseClasses = "flex items-center rounded-lg bg-purple-600/10 border border-purple-500/30 transition-colors"
  const textClasses = mobileLayout ? "text-base" : "text-sm"
  const paddingClasses = mobileLayout ? "px-4 py-3" : "px-3 py-2"

  const toggleButton = (
    <button
      type="button"
      onClick={() => setIsOpen(v => !v)}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      className={`${badgeBaseClasses} ${paddingClasses} hover:bg-purple-600/15 cursor-pointer`}
    >
      {primaryIsLoading ? (
        <>
          <Loader2 className={`w-4 h-4 text-purple-400 animate-spin ${mobileLayout ? 'w-5 h-5' : ''}`} />
          <span className={`text-gray-300 ${textClasses}`}>Loading...</span>
        </>
      ) : hasPrimaryBalance ? (
        <>
          <Coins className={`text-purple-400 ${mobileLayout ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <span className={`text-white font-medium ${textClasses}`}>{toWholeNumber(primary.balance!.formattedBalance)}</span>
          <span className={`text-gray-300 ${textClasses}`}>{primary.balance!.symbol}</span>
          {nonZeroCount > 1 && (
            <span className={`text-purple-400 ${textClasses}`}>+{nonZeroCount - 1}</span>
          )}
        </>
      ) : (
        <>
          <Coins className={`text-gray-500 ${mobileLayout ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <span className={`text-gray-400 ${textClasses}`}>—</span>
        </>
      )}
      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )

  const balanceList = (
    <div
      role="listbox"
      aria-label="Token balances"
      className={`divide-y divide-gray-700/50 ${mobileLayout ? '' : 'rounded-lg bg-gray-900/95 border border-gray-700/50 backdrop-blur-lg shadow-xl'}`}
    >
      {allBalances.map(row => (
        <BalanceRow key={row.coin.id} row={row} mobileLayout={mobileLayout} />
      ))}
    </div>
  )

  if (mobileLayout) {
    return (
      <div ref={containerRef}>
        {toggleButton}
        {isOpen && (
          <div className="mt-1 animate-fade-in">
            {balanceList}
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {toggleButton}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-56 z-50 animate-fade-in"
        >
          {balanceList}
        </div>
      )}
    </div>
  )
}
