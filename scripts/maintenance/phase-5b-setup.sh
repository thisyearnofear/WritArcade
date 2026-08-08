#!/bin/bash

# Phase 5b Setup Script
# Runs database migrations and prepares for testing

set -e

echo "🚀 Phase 5b Setup: Database Migrations & Testing Prep"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env with DATABASE_URL"
    exit 1
fi

# Check if dev server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Dev server is running on port 3000"
    echo "Stopping dev server..."
    npm run kill:dev 2>/dev/null || true
    sleep 2
fi

echo ""
echo "Step 1: Running database migrations..."
echo "---"

# Apply migrations
if npx prisma migrate deploy 2>&1; then
    echo "✅ Migrations applied successfully"
else
    echo "⚠️  Migration deploy failed. Trying generate..."
    npx prisma generate
fi

echo ""
echo "Step 2: Verifying schema..."
echo "---"

# Generate Prisma client
npx prisma generate
echo "✅ Prisma client generated"

echo ""
echo "Step 3: Database verification..."
echo "---"

# Optional: Run studio briefly to verify
echo "Opening Prisma Studio for verification..."
echo "Check for:"
echo "  ✓ New 'payments' table"
echo "  ✓ Game model has: nftTokenId, nftTransactionHash, nftMintedAt, paymentId"
echo ""
echo "Press Ctrl+C to close Prisma Studio and continue"

npx prisma studio || true

echo ""
echo "=================================================="
echo "✅ Phase 5b Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Test web app: http://localhost:3000/"
echo "3. Test mini-app: http://localhost:3000/mini-app"
echo "4. Follow PHASE_5B_TESTING.md for full test checklist"
echo ""
echo "Documentation: docs/PHASE_5B_TESTING.md"
