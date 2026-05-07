// Stub for @mezo-org/orangekit
// The real package re-exports from orangekit-contracts and orangekit-smart-account
// which ship untranspiled TypeScript that webpack can't parse.
// This stub re-exports the chain definitions passport needs at runtime,
// plus safe no-ops for other APIs.

const { mezoTestnet, mezoMainnet, getChainById } = require('./mezo-chains.js');

export { mezoTestnet, mezoMainnet, getChainById };

export const relayTransaction = () => Promise.resolve();
export const LocalTransactionSender = class {};
export const GelatoTransactionSender = class {};
export const MezoTransactionSender = class {};
export const predictOrangeKitAddress = () => '';
export const bitcoinSafeOwnerAbi = [];
export default {};
