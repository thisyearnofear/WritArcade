#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient()

function arg(name) {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

async function repairTargeted(gameId, transactionHash, apply) {
  const [game, payment] = await Promise.all([
    prisma.game.findUnique({ where: { id: gameId } }),
    prisma.payment.findUnique({ where: { transactionHash } }),
  ])

  if (!game) throw new Error(`Game not found: ${gameId}`)
  if (!payment) throw new Error(`Payment not found: ${transactionHash}`)
  if (payment.action !== 'generate-game') throw new Error(`Payment action is ${payment.action}, expected generate-game`)
  if (payment.status !== 'verified') throw new Error(`Payment status is ${payment.status}, expected verified`)
  if (!payment.writerCoinId) throw new Error('Payment is missing writerCoinId')

  const update = {
    writerCoinId: payment.writerCoinId,
    paymentId: payment.id,
    ownerWallet: payment.walletAddress || game.ownerWallet,
    creatorWallet: payment.walletAddress || game.creatorWallet,
    ownershipSource: 'payment_wallet',
  }

  console.log(JSON.stringify({ mode: 'targeted', gameId, transactionHash, update }, null, 2))

  if (!apply) return

  await prisma.game.update({
    where: { id: gameId },
    data: update,
  })
}

async function repairLinked(apply) {
  const games = await prisma.game.findMany({
    where: {
      writerCoinId: null,
      paymentId: { not: null },
      payment: {
        action: 'generate-game',
        status: 'verified',
      },
    },
    include: { payment: true },
  })

  console.log(`Found ${games.length} linked game(s) missing writerCoinId`)

  for (const game of games) {
    if (!game.payment?.writerCoinId) continue
    const update = {
      writerCoinId: game.payment.writerCoinId,
      ownerWallet: game.payment.walletAddress || game.ownerWallet,
      creatorWallet: game.payment.walletAddress || game.creatorWallet,
      ownershipSource: 'payment_wallet',
    }

    console.log(JSON.stringify({ mode: 'linked', gameId: game.id, slug: game.slug, update }, null, 2))

    if (apply) {
      await prisma.game.update({
        where: { id: game.id },
        data: update,
      })
    }
  }
}

async function listMissing() {
  const games = await prisma.game.findMany({
    where: { writerCoinId: null },
    select: {
      id: true,
      slug: true,
      title: true,
      articleUrl: true,
      ownerWallet: true,
      creatorWallet: true,
      paymentId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })

  console.log(JSON.stringify(games, null, 2))
}

async function main() {
  if (hasFlag('help')) {
    console.log([
      'Usage:',
      '  npm run repair:game-funding',
      '  npm run repair:game-funding -- --apply',
      '  npm run repair:game-funding -- --game-id=<gameId> --transaction-hash=<txHash>',
      '  npm run repair:game-funding -- --game-id=<gameId> --transaction-hash=<txHash> --apply',
      '  npm run repair:game-funding -- --list-missing',
      '',
      'Default mode is dry-run. Add --apply to update rows.',
    ].join('\n'))
    return
  }

  const gameId = arg('game-id')
  const transactionHash = arg('transaction-hash')
  const apply = hasFlag('apply')

  if (hasFlag('list-missing')) {
    await listMissing()
    return
  }

  if (Boolean(gameId) !== Boolean(transactionHash)) {
    throw new Error('Use both --game-id and --transaction-hash for targeted repair, or neither for linked bulk repair.')
  }

  if (gameId && transactionHash) {
    await repairTargeted(gameId, transactionHash, apply)
  } else {
    await repairLinked(apply)
  }

  console.log(apply ? 'Repair applied.' : 'Dry run only. Re-run with --apply to update rows.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
