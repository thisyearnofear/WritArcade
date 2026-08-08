#!/bin/bash
# scripts/deploy-mezo.sh

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Check for required variables
if [ -z "$MEZO_DEPLOYER_PRIVATE_KEY" ]; then
  echo "❌ Error: MEZO_DEPLOYER_PRIVATE_KEY is missing in .env.local"
  exit 1
fi

if [ -z "$PLATFORM_TREASURY_ADDRESS" ]; then
  echo "❌ Error: PLATFORM_TREASURY_ADDRESS is missing in .env.local"
  exit 1
fi

if [ -z "$MEZO_TESTNET_MUSD_ADDRESS" ]; then
  echo "❌ Error: MEZO_TESTNET_MUSD_ADDRESS is missing in .env.local. You need to provide the official MUSD token address on Mezo testnet."
  exit 1
fi

MEZO_PRECOMPILE="0x7B7c000000000000000000000000000000000001"

echo "🚀 Deploying MezoBoostedSplitter v2 (with payForGeneration) to Mezo Testnet..."
echo "    MUSD token: $MEZO_TESTNET_MUSD_ADDRESS"
echo "    MEZO precompile: $MEZO_PRECOMPILE"
echo "    Platform treasury: $PLATFORM_TREASURY_ADDRESS"

# Use forge to compile and deploy
forge create contracts/src/MezoBoostedSplitter.sol:MezoBoostedSplitter \
  --rpc-url https://rpc.test.mezo.org \
  --private-key $MEZO_DEPLOYER_PRIVATE_KEY \
  --legacy \
  --constructor-args $MEZO_TESTNET_MUSD_ADDRESS $MEZO_PRECOMPILE $PLATFORM_TREASURY_ADDRESS

echo "✅ Deployment complete. Note the 'Deployed to' address above."
echo "➡️ Next, update NEXT_PUBLIC_MEZO_PAYMENT_SPLITTER_TESTNET in .env.local"
echo "➡️ Then, run: ./scripts/deploy-goldsky.sh <YOUR_NEW_CONTRACT_ADDRESS>"
