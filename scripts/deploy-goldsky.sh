#!/bin/bash
# scripts/deploy-goldsky.sh

CONTRACT_ADDRESS=$1

if [ -z "$CONTRACT_ADDRESS" ]; then
  echo "❌ Error: Please provide the deployed contract address."
  echo "Usage: ./scripts/deploy-goldsky.sh 0xYourContractAddress"
  exit 1
fi

echo "📝 Updating indexer/goldsky-mezo.yaml with contract address..."

# Replace the placeholder address with the actual one (works on mac/linux)
sed -i.bak "s/0xYourMezoContractAddress/$CONTRACT_ADDRESS/g" indexer/goldsky-mezo.yaml
rm indexer/goldsky-mezo.yaml.bak

echo "🚀 Deploying to Goldsky..."

# Run Goldsky deployment
npx goldsky subgraph deploy writersarcade-mezo/1.0.0 \
  --from-abi out/MezoPaymentSplitter.abi.json \
  --network mezo-testnet \
  --contract-address $CONTRACT_ADDRESS \
  --contract-name MezoPaymentSplitter \
  --start-block 0

echo "✅ Goldsky subgraph deployed."
