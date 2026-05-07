// Stub for @metamask/sdk — we don't use MetaMask directly.
// It is pulled in transitively by @wagmi/connectors but bundles its own
// React copy which causes "ReactCurrentOwner" duplicate-React runtime errors.
// Stubbing it out eliminates the duplicate React instance from the client bundle.
export const MetaMaskSDK = function() {};
export const SDKProvider = function() {};
export default { MetaMaskSDK, SDKProvider };
