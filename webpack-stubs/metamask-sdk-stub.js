// Stub for @metamask/sdk — we don't use MetaMask directly.
// It is pulled in transitively by @wagmi/connectors but bundles its own
// React copy which causes "ReactCurrentOwner" duplicate-React runtime errors.
// Stubbing it out eliminates the duplicate React instance from the client bundle.
// Must use CommonJS exports — NormalModuleReplacementPlugin requires CJS.
function MetaMaskSDK() {}
function SDKProvider() {}
module.exports = { MetaMaskSDK, SDKProvider, default: { MetaMaskSDK, SDKProvider } };
