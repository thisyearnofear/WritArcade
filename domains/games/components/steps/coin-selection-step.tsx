'use client'

import { motion } from 'framer-motion'
import { WriterCoinSelector } from '@/components/game/WriterCoinSelector'
import { type WriterCoin } from '@/lib/writerCoins'

interface CoinSelectionStepProps {
  onSelect: (coin: WriterCoin) => void
}

export function CoinSelectionStep({ onSelect }: CoinSelectionStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto px-4"
    >
      <WriterCoinSelector onSelect={onSelect} />
    </motion.div>
  )
}