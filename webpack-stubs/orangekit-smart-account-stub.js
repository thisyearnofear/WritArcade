// Stub for @mezo-org/orangekit-smart-account
// The real package exports modules referencing untranspiled TypeScript
// (chains.ts with `as const` asserts) which webpack can't parse.
// This stub exports safe no-ops so the client bundle builds cleanly.

export const mezoTestnet = {};
export const relayTransaction = () => Promise.resolve();
export const LocalTransactionSender = class {};
export const GelatoTransactionSender = class {};
export const MezoTransactionSender = class {};
export const predictOrangeKitAddress = () => '';
export default {};
