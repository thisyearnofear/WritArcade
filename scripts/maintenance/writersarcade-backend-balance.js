/**
 * ERC-20 balance checker with server-side caching.
 * Uses persistent viem client for better performance.
 */

const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

// Writer coin registry (matches lib/writer-coins.ts)
const WRITER_COINS = {
  avc: {
    symbol: '$AVC',
    address: '0x06FC3D5D2369561e28F261148576520F5e49D6ea',
    decimals: 18,
  },
  debbie: {
    symbol: '$DEBBIE',
    address: '0x4ea5d3ff9e8295a552903d4bd486ce8cf8291c60',
    decimals: 18,
  },
  jake: {
    symbol: '$JAKE',
    address: '0xC2E3A4d07fdff60f3CdCb39FD94Fc11F254938B9',
    decimals: 18,
  },
  tso: {
    symbol: '$THOUGHTS',
    address: '0x98cacf94eb68ea4c5bdc4d70a1a04c2c2cffde39',
    decimals: 18,
  },
  papa: {
    symbol: '$PARAPAPA',
    address: '0x300efb94e4a7fcf71184eeeb82cb2b7af4a6ea58',
    decimals: 18,
  },
};

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
];

// Server-side balance cache (persists across requests in long-lived process)
const balanceCache = new Map();
const CACHE_DURATION = 15000; // 15 seconds

// Persistent client — reused across all requests
let client = null;

function getClient() {
  if (client) return client;

  const rpcUrl =
    process.env.BASE_RPC_URL || 'https://mainnet.base.org';

  client = createPublicClient({
    chain: base,
    transport: http(rpcUrl, { timeout: 10_000, retryCount: 2 }),
  });
  return client;
}

async function routes(fastify) {
  fastify.get('/balance', async (request, reply) => {
    const { wallet, coin: coinId = 'avc' } = request.query || {};

    if (!wallet) {
      return reply.code(400).send({ error: 'Wallet address required' });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return reply.code(400).send({ error: 'Invalid wallet address format' });
    }

    const coin = WRITER_COINS[coinId];
    if (!coin) {
      return reply.code(400).send({ error: `Unknown writer coin: ${coinId}` });
    }

    // Check server-side cache
    const cacheKey = `${wallet.toLowerCase()}-${coinId}`;
    const cached = balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return reply.send({
        success: true,
        data: {
          wallet,
          coin: coinId,
          balance: cached.data.balance,
          decimals: coin.decimals,
          symbol: coin.symbol,
          formattedBalance: cached.data.formattedBalance,
        },
      });
    }

    try {
      const c = getClient();
      const balance = await c.readContract({
        address: coin.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [wallet],
      });

      const divisor = BigInt(10 ** coin.decimals);
      const whole = (balance / divisor).toString();
      const remainder = (balance % divisor)
        .toString()
        .padStart(coin.decimals, '0');
      const trimmed = remainder.slice(0, 6).replace(/0+$/, '');
      const formatted = trimmed ? `${whole}.${trimmed}` : whole;

      // Cache the result
      balanceCache.set(cacheKey, {
        data: { balance: balance.toString(), formattedBalance: formatted },
        timestamp: Date.now(),
      });

      return reply.send({
        success: true,
        data: {
          wallet,
          coin: coinId,
          balance: balance.toString(),
          decimals: coin.decimals,
          symbol: coin.symbol,
          formattedBalance: formatted,
        },
      });
    } catch (err) {
      request.log.error('[Balance] Error:', err.message);

      // Reset client on RPC failure so next request tries fresh
      client = null;

      return reply.code(500).send({
        error: 'Failed to fetch balance',
        details: err.message,
      });
    }
  });

  // Clear cache endpoint (for debugging)
  fastify.get('/balance/clear', async () => {
    balanceCache.clear();
    return { success: true, message: 'Cache cleared' };
  });
}

module.exports = routes;