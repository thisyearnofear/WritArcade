'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { Coins, Loader2, ChevronDown, Sparkles, ArrowRightLeft, Banknote } from 'lucide-react'
import { WRITER_COINS } from '@/lib/writerCoins'
import { CopyAddressButton } from '@/components/ui/copy-address-button'
import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { useMezoBalance } from '@/hooks/useMezoBalance'
import { getChainInfo, MEZO_TESTNET_CHAIN_ID, type ChainInfo } from '@/lib/chains'

interface BalanceDisplayProps {
  mobileLayout?: boolean
}

interface CoinBalanceRow {
  coin: typeof WRITER_COINS[number]
  balance: ReturnType<typeof useWriterCoinBalance>['balance']
  isLoading: boolean
}

interface EcosystemGroup {
  id: 'base' | 'mezo' | 'credits'
  label: string
  chain?: ChainInfo
  rows: Array<{
    id: string
    symbol: string
    address?: string
    value: string
    isLoading: boolean
    isZero: boolean
    accentClass: string
  }>
}

function useCreditsBalance() {
  const { address, isConnected } = useAccount()
  const [credits, setCredits] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) {
      setCredits(null)
      return
    }
    setIsLoading(true)
    fetch(`/api/ramp/credits?wallet=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setCredits(data.data.credits ?? 0)
      })
      .catch(() => setCredits(0))
      .finally(() => setIsLoading(false))
  }, [address, isConnected])

  return { credits: credits ?? 0, isLoading }
}

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

function toWholeNumber(formatted: string): string {
  return formatted.split('.')[0] ?? formatted
}

function abbreviateBalance(formatted: string): string {
  const num = parseFloat(formatted)
  if (isNaN(num)) return formatted
  if (num < 1000) return toWholeNumber(formatted)
  if (num < 1_000_000) {
    const k = num / 1000
    return k >= 100 ? `${Math.round(k)}k` : `${parseFloat(k.toFixed(1))}k`
  }
  if (num < 1_000_000_000) {
    const m = num / 1_000_000
    return m >= 100 ? `${Math.round(m)}m` : `${parseFloat(m.toFixed(1))}m`
  }
  const b = num / 1_000_000_000
  return b >= 100 ? `${Math.round(b)}b` : `${parseFloat(b.toFixed(1))}b`
}

function getPrimaryBalance(rows: CoinBalanceRow[]) {
  const nonZero = rows.find(r => r.balance && r.balance.formattedBalance !== '0')
  return nonZero ?? rows[0]
}

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

function BalanceRow({
  symbol,
  address,
  value,
  isLoading,
  isZero,
  mobileLayout,
  accentClass,
  icon,
}: {
  symbol: string
  address?: string
  value: string
  isLoading: boolean
  isZero: boolean
  mobileLayout: boolean
  accentClass: string
  icon?: React.ReactNode
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${mobileLayout ? 'py-2.5 px-4' : 'py-2 px-3'}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon ?? <Coins className={`w-4 h-4 shrink-0 ${isZero ? 'text-muted-foreground' : accentClass}`} />}
        <span className={`text-sm font-medium truncate ${isZero ? 'text-muted-foreground' : 'text-foreground'}`}>
          {symbol}
        </span>
        {address && (
          <CopyAddressButton
            address={address}
            sizeClass="w-3 h-3"
            labelPrefix={`Copy ${symbol}`}
          />
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
        ) : (
          <span className={`text-sm tabular-nums ${isZero ? 'text-muted-foreground' : 'text-white font-medium'}`}>
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

function EcosystemSection({
  group,
  mobileLayout,
  isMezoHolder,
  mezoFormatted,
  switchToMezo,
  isSwitching,
  isOnMezo,
}: {
  group: EcosystemGroup
  mobileLayout: boolean
  isMezoHolder: boolean
  mezoFormatted: string
  switchToMezo?: () => void
  isSwitching?: boolean
  isOnMezo?: boolean
}) {
  return (
    <div>
      {group.chain ? (
        <div className={`flex items-center justify-between gap-2 border-b border-border/50 ${mobileLayout ? 'px-4 py-2' : 'px-3 py-2'}`}>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${group.chain.bgColor} ${group.chain.color}`}>
              {group.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.chain.purpose}
            </span>
          </div>
          {group.id === 'mezo' && isMezoHolder && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3 h-3" />
              MEZO Holder
            </span>
          )}
        </div>
      ) : (
        <div className={`flex items-center gap-2 border-b border-border/50 ${mobileLayout ? 'px-4 py-2' : 'px-3 py-2'}`}>
          <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            {group.label}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Fiat onramp credits
          </span>
        </div>
      )}

      {group.rows.map((row) => (
        <BalanceRow
          key={row.id}
          symbol={row.symbol}
          address={row.address}
          value={row.value}
          isLoading={row.isLoading}
          isZero={row.isZero}
          mobileLayout={mobileLayout}
          accentClass={row.accentClass}
          icon={group.id === 'credits' ? <Banknote className={`w-4 h-4 shrink-0 ${row.isZero ? 'text-muted-foreground' : 'text-emerald-400'}`} /> : undefined}
        />
      ))}

      {group.id === 'mezo' && (
        <div className={`${mobileLayout ? 'px-4 pb-3' : 'px-3 pb-3'} space-y-2`}>
          <div className="text-[11px] text-muted-foreground">
            {isMezoHolder ? `Holder balance: ${mezoFormatted} MEZO` : 'Hold at least 1 MEZO to unlock holder perks.'}
          </div>
          {switchToMezo && !isOnMezo && (
            <button
              onClick={switchToMezo}
              disabled={isSwitching}
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors disabled:opacity-50"
            >
              <ArrowRightLeft className="w-3 h-3" />
              {isSwitching ? 'Switching...' : 'Switch to Mezo'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function BalanceDisplay({ mobileLayout = false }: BalanceDisplayProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allBalances = useAllWriterCoinBalances()
  const { formatted: mezoFormatted, isHolder: isMezoHolder, isLoading: isLoadingMezo } = useMezoBalance()
  const { credits, isLoading: isLoadingCredits } = useCreditsBalance()

   
  useEffect(() => {
    setMounted(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])
  useClickOutside(containerRef, close)

   
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  const primary = getPrimaryBalance(allBalances)
  const primaryIsLoading = primary.isLoading
  const hasPrimaryBalance = primary.balance && primary.balance.formattedBalance !== '0'
  const nonZeroCount = allBalances.filter(r => r.balance && r.balance.formattedBalance !== '0').length
  const hasCredits = credits > 0

  const ecosystemGroups = useMemo<EcosystemGroup[]>(() => {
    const baseChain = getChainInfo(primary.coin ? 8453 : 8453)
    const mezoChain = getChainInfo(MEZO_TESTNET_CHAIN_ID)

    return [
      {
        id: 'base',
        label: 'Base',
        chain: baseChain,
        rows: allBalances.map((row) => ({
          id: row.coin.id,
          symbol: row.coin.symbol,
          address: row.coin.address,
          value: row.balance ? toWholeNumber(row.balance.formattedBalance) : '—',
          isLoading: row.isLoading,
          isZero: !row.balance || row.balance.formattedBalance === '0',
          accentClass: 'text-purple-400',
        })),
      },
      {
        id: 'mezo',
        label: 'Mezo',
        chain: mezoChain,
        rows: [
          {
            id: 'mezo-holder',
            symbol: 'MEZO',
            address: '0x7B7c000000000000000000000000000000000001',
            value: isLoadingMezo ? '—' : toWholeNumber(mezoFormatted),
            isLoading: isLoadingMezo,
            isZero: !isMezoHolder && mezoFormatted === '0.00',
            accentClass: 'text-amber-400',
          },
        ],
      },
      {
        id: 'credits',
        label: 'Credits',
        rows: [
          {
            id: 'credits-balance',
            symbol: 'Credits',
            value: isLoadingCredits ? '—' : credits.toString(),
            isLoading: isLoadingCredits,
            isZero: !hasCredits && credits === 0,
            accentClass: 'text-emerald-400',
          },
        ],
      },
    ]
  }, [allBalances, isMezoHolder, isLoadingMezo, mezoFormatted, primary.coin, credits, isLoadingCredits, hasCredits])

  if (!mounted || !isConnected) {
    return null
  }

  const badgeBaseClasses = 'flex items-center rounded-lg bg-purple-600/10 border border-purple-500/30 transition-colors'
  const textClasses = mobileLayout ? 'text-base' : 'text-sm'
  const paddingClasses = mobileLayout ? 'px-4 py-3' : 'px-3 py-2'

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
          <span className={`text-muted-foreground ${textClasses}`}>Loading...</span>
        </>
      ) : hasPrimaryBalance ? (
        <>
          <Coins className={`text-purple-400 ${mobileLayout ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <span className={`text-white font-medium ${textClasses}`}>{abbreviateBalance(primary.balance!.formattedBalance)}</span>
          <span className={`text-muted-foreground ${textClasses}`}>{primary.balance!.symbol}</span>
          {nonZeroCount > 1 && (
            <span className={`text-purple-400 ${textClasses}`}>+{nonZeroCount - 1}</span>
          )}
        </>
      ) : (
        <>
          <Coins className={`text-muted-foreground ${mobileLayout ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <span className={`text-muted-foreground ${textClasses}`}>—</span>
        </>
      )}
      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )

  const balanceList = (
    <div
      role="listbox"
      aria-label="Token balances"
      className={`divide-y divide-border/50 ${mobileLayout ? '' : 'rounded-lg bg-card border border-border/50 backdrop-blur-lg shadow-xl'}`}
    >
      {ecosystemGroups.map((group) => (
        <EcosystemSection
          key={group.id}
          group={group}
          mobileLayout={mobileLayout}
          isMezoHolder={isMezoHolder}
          mezoFormatted={mezoFormatted}
          switchToMezo={group.id === 'mezo' ? () => switchChain({ chainId: MEZO_TESTNET_CHAIN_ID }) : undefined}
          isSwitching={isSwitching}
          isOnMezo={getChainInfo(chainId).ecosystem === 'mezo'}
        />
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
          className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-2rem)] z-50 animate-fade-in"
        >
          {balanceList}
        </div>
      )}
    </div>
  )
}
