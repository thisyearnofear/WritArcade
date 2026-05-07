// Stub for @mezo-org/orangekit
// The real package re-exports from orangekit-contracts and orangekit-smart-account
// which ship untranspiled TypeScript that webpack can't parse.
// This stub exports safe no-ops so the client bundle builds cleanly.

export const mezoTestnet = {};
export const relayTransaction = () => Promise.resolve();
export const LocalTransactionSender = class {};
export const GelatoTransactionSender = class {};
export const MezoTransactionSender = class {};
export const predictOrangeKitAddress = () => '';
export const bitcoinSafeOwnerAbi = [];
export default {};
