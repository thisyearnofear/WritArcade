#!/bin/bash
# scripts/deploy-goldsky.sh
# Deploy Goldsky pipeline for MezoBoostedSplitter event indexing
#
# Prerequisites:
#   npx goldsky login
#
# Usage:
#   ./scripts/deploy-goldsky.sh

set -euo pipefail

echo "🚀 Validating pipeline config..."
npx goldsky pipeline validate indexer/goldsky-mezo.yaml

echo "🚀 Deploying Goldsky pipeline..."
npx goldsky pipeline apply indexer/goldsky-mezo.yaml

echo "✅ Goldsky pipeline deployed."
echo ""
echo "To query the analytics dataset:"
echo "  npx goldsky dataset get writersarcade-mezo"
echo ""
echo "To monitor the pipeline:"
echo "  npx goldsky pipeline monitor writersarcade-mezo"
