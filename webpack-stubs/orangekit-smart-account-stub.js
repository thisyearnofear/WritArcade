// Stub for @mezo-org/orangekit-smart-account
// The real package exports modules referencing untranspiled TypeScript
// (chains.ts with `as const` asserts) which webpack can't parse.
// This stub re-exports the chain definitions passport needs at runtime,
// plus safe no-ops for transaction-sending APIs.

const { mezoTestnet, mezoMainnet, getChainById } = require('./mezo-chains.js');

export { mezoTestnet, mezoMainnet, getChainById };

export const relayTransaction = () => Promise.resolve();
export const LocalTransactionSender = class {};
export const GelatoTransactionSender = class {};
export const MezoTransactionSender = class {};
export const predictOrangeKitAddress = () => '';
export default {};
