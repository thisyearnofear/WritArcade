#!/bin/bash
# Fix pnpm module resolution issues for Next.js 16 build

echo "Fixing @wagmi/core symlink..."
WAGMI_CORE=$(find node_modules/.pnpm -maxdepth 1 -type d -name "@wagmi+core@2.22.1*" | head -1)
if [ -d "$WAGMI_CORE" ]; then
  mkdir -p node_modules/@wagmi
  rm -f node_modules/@wagmi/core
  ln -s "$(pwd)/$WAGMI_CORE/node_modules/@wagmi/core" "$(pwd)/node_modules/@wagmi/core"
  echo "✓ @wagmi/core symlink created"
fi

echo "Fixing viem symlink..."
VIEM=$(find node_modules/.pnpm -maxdepth 1 -type d -name "viem@*" | head -1)
if [ -d "$VIEM" ]; then
  rm -f node_modules/viem
  ln -s "$(pwd)/$VIEM/node_modules/viem" "$(pwd)/node_modules/viem"
  echo "✓ viem symlink created"
fi

echo "Build fixes applied"
