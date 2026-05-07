// Stub for @mezo-org/passport
// The real package uses bare ESM directory imports (export * from "./components")
// which Node.js ESM rejects during SSR/static prerendering.
// This stub exports safe no-ops so the server-side render completes cleanly.
// The real package is loaded client-side by webpack where it works correctly.

import React from 'react';

export const mezoTestnet = {
  id: 31611,
  name: 'Mezo Matsnet',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.matsnet.mezo.org'] } },
  testnet: true,
};

export function getConfig(options) {
  throw new Error('@mezo-org/passport: getConfig called server-side — this should only run on the client.');
}

export function getDefaultWallets(env) {
  return [];
}

export function PassportProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

// Re-export anything else that might be imported
export default {};
