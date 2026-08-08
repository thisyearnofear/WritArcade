import { describe, it, expect } from 'vitest'
import {
  encodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  parseAbi,
  parseAbiItem,
  parseAbiParameters,
} from 'viem'
import {
  verifyPaymentEvidence,
  getExpectedPaymentContract,
  getPaymentAmount,
  type VerifyEvidenceParams,
} from '@/services/payments/payment-verifier'
import { getWriterCoinById } from '@/lib/writer-coins'

const USER = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
const avc = getWriterCoinById('avc')!
const COIN = avc.address
const CONTRACT = avc.paymentContractAddress

const baseGen = parseAbi(['function payForGameGeneration(address writerCoin)'])

function genCalldata(coin: string) {
  return encodeFunctionData({
    abi: baseGen,
    functionName: 'payForGameGeneration',
    args: [coin as `0x${string}`],
  })
}

function gameGeneratedLog(opts: { user: string; coin: string; amountPaid: bigint }) {
  const event = parseAbiItem(
    'event GameGenerated(address indexed user, address indexed writerCoin, uint256 amountPaid, uint256 writerShare, uint256 platformShare, uint256 creatorPoolShare)'
  )
  const topics = encodeEventTopics({
    abi: [event],
    eventName: 'GameGenerated',
    args: { user: opts.user as `0x${string}`, writerCoin: opts.coin as `0x${string}` },
  })
  const data = encodeAbiParameters(parseAbiParameters('uint256,uint256,uint256,uint256'), [
    opts.amountPaid, 6000n, 2000n, 2000n,
  ])
  return { topics: topics as unknown as string[], data }
}

function makeBaseGenerateEvidence(overrides?: {
  from?: string
  to?: string
  input?: string
  logs?: Array<{ topics: string[]; data: string }>
  status?: string
}): VerifyEvidenceParams {
  const logs = overrides?.logs ?? [gameGeneratedLog({ user: USER, coin: COIN, amountPaid: avc.gameGenerationCost })]
  return {
    transactionHash: ('0x' + 'a'.repeat(64)) as `0x${string}`,
    writerCoinId: 'avc',
    userAddress: USER,
    action: 'generate-game',
    chainId: 8453,
    receipt: { status: overrides?.status ?? 'success', logs },
    transaction: {
      from: overrides?.from ?? USER,
      to: (overrides?.to ?? CONTRACT) as string,
      input: (overrides?.input ?? genCalldata(COIN)) as `0x${string}`,
    },
  }
}

describe('verifyPaymentEvidence — Base writer-coin generate', () => {
  it('verifies a valid generate payment', () => {
    const res = verifyPaymentEvidence(makeBaseGenerateEvidence())
    expect(res.amount).toBe(avc.gameGenerationCost.toString())
    expect(res.functionName).toBe('payForGameGeneration')
  })

  it('rejects when the transaction did not succeed', () => {
    expect(() => verifyPaymentEvidence(makeBaseGenerateEvidence({ status: 'reverted' }))).toThrow(
      /did not succeed/i
    )
  })

  it('rejects when the sender does not match the authenticated wallet', () => {
    expect(() =>
      verifyPaymentEvidence(makeBaseGenerateEvidence({ from: '0x' + 'b'.repeat(40) }))
    ).toThrow(/sender does not match/i)
  })

  it('rejects when sent to the wrong contract', () => {
    expect(() =>
      verifyPaymentEvidence(makeBaseGenerateEvidence({ to: '0x' + 'c'.repeat(40) }))
    ).toThrow(/expected payment contract/i)
  })

  it('rejects when the wrong function is called', () => {
    const wrongInput = encodeFunctionData({
      abi: parseAbi(['function transferFrom(address,address,uint256)']),
      functionName: 'transferFrom',
      args: [USER as `0x${string}`, CONTRACT as `0x${string}`, 1n],
    })
    expect(() => verifyPaymentEvidence(makeBaseGenerateEvidence({ input: wrongInput }))).toThrow(
      /expected payment function/i
    )
  })

  it('rejects when the writer coin argument does not match the selected coin', () => {
    const other = getWriterCoinById('papa')!
    expect(() =>
      verifyPaymentEvidence(makeBaseGenerateEvidence({ input: genCalldata(other.address) }))
    ).toThrow(/writer coin in transaction does not match/i)
  })

  it('rejects when the expected event is missing', () => {
    expect(() => verifyPaymentEvidence(makeBaseGenerateEvidence({ logs: [] }))).toThrow(
      /event was not found/i
    )
  })

  it('rejects when the payment event writer coin does not match', () => {
    const other = getWriterCoinById('papa')!
    const wrongEvent = gameGeneratedLog({ user: USER, coin: other.address, amountPaid: avc.gameGenerationCost })
    expect(() => verifyPaymentEvidence(makeBaseGenerateEvidence({ logs: [wrongEvent] }))).toThrow(
      /event writer coin does not match/i
    )
  })

  it('rejects when the amount is less than the required cost', () => {
    const lowEvent = gameGeneratedLog({ user: USER, coin: COIN, amountPaid: avc.gameGenerationCost - 1n })
    expect(() => verifyPaymentEvidence(makeBaseGenerateEvidence({ logs: [lowEvent] }))).toThrow(
      /less than the required cost/i
    )
  })

  it('rejects when the event sender does not match', () => {
    const wrongSender = gameGeneratedLog({ user: '0x' + 'd'.repeat(40) as `0x${string}`, coin: COIN, amountPaid: avc.gameGenerationCost })
    expect(() => verifyPaymentEvidence(makeBaseGenerateEvidence({ logs: [wrongSender] }))).toThrow(
      /event sender does not match/i
    )
  })
})

describe('verifyPaymentEvidence — Base writer-coin mint', () => {
  const baseMint = parseAbi([
    'struct GameMetadata { string articleUrl; address creator; address writerCoin; string genre; string difficulty; uint256 createdAt; string gameTitle }',
    'function payAndMintGame(address writerCoin, string tokenURI, GameMetadata metadata) external returns (uint256)',
  ])

  function mintCalldata(coin: string, creator: string) {
    const metadata = {
      articleUrl: 'https://example.com/1',
      creator: creator as `0x${string}`,
      writerCoin: coin as `0x${string}`,
      genre: 'mystery',
      difficulty: 'medium',
      createdAt: 1n,
      gameTitle: 'Test Game',
    } as never
    return encodeFunctionData({
      abi: baseMint,
      functionName: 'payAndMintGame',
      args: [coin as `0x${string}`, 'ipfs://game/1', metadata],
    })
  }

  function gameMintedLog(opts: { minter: string; coin: string; amountPaid: bigint }) {
    const event = parseAbiItem(
      'event GameMinted(address indexed minter, address indexed writerCoin, uint256 tokenId, uint256 amountPaid, uint256 creatorShare, uint256 writerShare, uint256 platformShare, uint256 minterRefund)'
    )
    const topics = encodeEventTopics({
      abi: [event],
      eventName: 'GameMinted',
      args: { minter: opts.minter as `0x${string}`, writerCoin: opts.coin as `0x${string}` },
    })
    const data = encodeAbiParameters(parseAbiParameters('uint256,uint256,uint256,uint256,uint256,uint256'), [
      7n, opts.amountPaid, 5000n, 5000n, 0n, 0n,
    ])
    return { topics: topics as unknown as string[], data }
  }

  function evidence(): VerifyEvidenceParams {
    return {
      transactionHash: ('0x' + 'e'.repeat(64)) as `0x${string}`,
      writerCoinId: 'avc',
      userAddress: USER,
      action: 'mint-nft',
      chainId: 8453,
      receipt: { status: 'success', logs: [gameMintedLog({ minter: USER, coin: COIN, amountPaid: avc.mintCost })] },
      transaction: { from: USER, to: CONTRACT, input: mintCalldata(COIN, USER) },
    }
  }

  it('verifies a valid mint payment', () => {
    const res = verifyPaymentEvidence(evidence())
    expect(res.functionName).toBe('payAndMintGame')
    expect(res.amount).toBe(avc.mintCost.toString())
  })

  it('rejects a mint when the amount is below mint cost', () => {
    const low = { ...evidence(), receipt: { status: 'success', logs: [gameMintedLog({ minter: USER, coin: COIN, amountPaid: avc.mintCost - 1n })] } }
    expect(() => verifyPaymentEvidence(low)).toThrow(/less than the required cost/i)
  })

  it('rejects a mint when the wrong function was called', () => {
    const wrong = { ...evidence(), transaction: { from: USER, to: CONTRACT, input: genCalldata(COIN) } }
    expect(() => verifyPaymentEvidence(wrong)).toThrow(/expected payment function/i)
  })
})

describe('verifyPaymentEvidence — Mezo (MUSD) generate', () => {
  const MEZO_CONTRACT = getExpectedPaymentContract('musd-testnet')
  const mezoGen = parseAbi(['function payForGeneration(uint256 amount)'])

  function mezoGenCalldata(amount: bigint) {
    return encodeFunctionData({ abi: mezoGen, functionName: 'payForGeneration', args: [amount] })
  }

  function mezoGenLog(opts: { user: string; amount: bigint }) {
    const event = parseAbiItem(
      'event GameGenerationPaid(address indexed user, uint256 amount, uint256 platformFee, uint256 writerFee, bool boosted)'
    )
    const topics = encodeEventTopics({ abi: [event], eventName: 'GameGenerationPaid', args: { user: opts.user as `0x${string}` } })
    const data = encodeAbiParameters(parseAbiParameters('uint256,uint256,uint256,bool'), [opts.amount, 2500n, 7500n, false])
    return { topics: topics as unknown as string[], data }
  }

  function evidence(opts?: { amount?: bigint; logs?: Array<{ topics: string[]; data: string }> }): VerifyEvidenceParams {
    const amount = opts?.amount ?? getPaymentAmount('musd-testnet', 'generate-game')
    return {
      transactionHash: ('0x' + 'f'.repeat(64)) as `0x${string}`,
      writerCoinId: 'musd-testnet',
      userAddress: USER,
      action: 'generate-game',
      chainId: 31611,
      receipt: { status: 'success', logs: opts?.logs ?? [mezoGenLog({ user: USER, amount })] },
      transaction: { from: USER, to: MEZO_CONTRACT, input: mezoGenCalldata(amount) },
    }
  }

  it('verifies a valid MUSD generate payment', () => {
    const res = verifyPaymentEvidence(evidence())
    expect(res.functionName).toBe('payForGeneration')
  })

  it('rejects Mezo generate when amount is below the configured cost', () => {
    expect(() => verifyPaymentEvidence(evidence({ amount: 999999999999999999n }))).toThrow(
      /less than the required cost/i
    )
  })

  it('rejects Mezo generate on a wrong function', () => {
    const wrong = { ...evidence(), transaction: { from: USER, to: MEZO_CONTRACT, input: '0x00000000' } }
    expect(() => verifyPaymentEvidence(wrong)).toThrow(/expected payment function/i)
  })
})