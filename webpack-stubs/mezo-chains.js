// Shared Mezo chain definitions for webpack stubs.
// Extracted here so orangekit-smart-account-stub.js and orangekit-stub.js
// don't duplicate the same 50+ line objects.

const mezoTestnet = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.test.mezo.org'],
      webSocket: ['wss://rpc-ws.test.mezo.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Mezo Testnet Explorer', url: 'https://explorer.test.mezo.org' },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 3669328,
    },
  },
  testnet: true,
};

const mezoMainnet = {
  id: 31612,
  name: 'Mezo',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc-internal.mezo.org'],
      webSocket: ['wss://rpc-ws-internal.mezo.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: 'https://explorer.mezo.org' },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 351760,
    },
  },
  testnet: false,
};

const getChainById = (id) => {
  if (id === 31611) return mezoTestnet;
  if (id === 31612) return mezoMainnet;
  return undefined;
};

module.exports = { mezoTestnet, mezoMainnet, getChainById };
