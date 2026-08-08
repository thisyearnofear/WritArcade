'use client'

import { type PaymentToken } from '@/lib/writer-coins'

interface PaymentTokenSelectorProps {
  selectedToken: PaymentToken
  onSelectToken: (token: PaymentToken) => void
  writerCoin: PaymentToken & { type: 'writercoin' }
}

export function PaymentTokenSelector({ selectedToken, onSelectToken, writerCoin }: PaymentTokenSelectorProps) {
  const writerCoinEnabled = writerCoin.coin.paymentEnabled

  return (
    <div className="flex gap-2 p-1 rounded-lg bg-slate-900/50 border border-purple-500/20 mb-4">
      <button
        type="button"
        onClick={() => writerCoinEnabled && onSelectToken(writerCoin)}
        disabled={!writerCoinEnabled}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          selectedToken.type === 'writercoin'
            ? 'bg-purple-600 text-white shadow-lg'
            : writerCoinEnabled
              ? 'text-purple-300 hover:bg-purple-800/50'
              : 'text-slate-500 cursor-not-allowed opacity-60'
        }`}
      >
        <span className="block">{writerCoin.coin.symbol} · Base</span>
        <span className={`block text-[10px] font-normal normal-case tracking-normal mt-0.5 ${
          selectedToken.type === 'writercoin' ? 'text-purple-200' : 'text-purple-400/60'
        }`}>
          {writerCoinEnabled ? 'Writer Coin' : 'Use MUSD'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelectToken({ type: 'musd', network: 'testnet' })}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          selectedToken.type === 'musd'
            ? 'bg-orange-600 text-white shadow-lg'
            : 'text-orange-300 hover:bg-orange-800/50'
        }`}
      >
        <span className="block">MUSD · Mezo</span>
        <span className={`block text-[10px] font-normal normal-case tracking-normal mt-0.5 ${
          selectedToken.type === 'musd' ? 'text-orange-200' : 'text-orange-400/60'
        }`}>
          Universal
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelectToken({ type: 'credits' })}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          selectedToken.type === 'credits'
            ? 'bg-emerald-600 text-white shadow-lg'
            : 'text-emerald-300 hover:bg-emerald-800/50'
        }`}
      >
        <span className="block">Credits</span>
        <span className={`block text-[10px] font-normal normal-case tracking-normal mt-0.5 ${
          selectedToken.type === 'credits' ? 'text-emerald-200' : 'text-emerald-400/60'
        }`}>
          No crypto needed
        </span>
      </button>
    </div>
  )
}
