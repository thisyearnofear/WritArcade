#!/bin/bash

# Verification script for writersarcade setup
# Run with: bash scripts/verify-setup.sh

echo "🔍 Verifying writersarcade setup..."
echo ""

# Check for required files
echo "📁 Checking file structure..."
files=(
  ".env.local"
  ".env.example"
  "docs/QUICK_REFERENCE.md"
  "docs/MODAL_SETUP.md"
  "scripts/modal/modal_image_gen.py"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (missing)"
  fi
done

echo ""
echo "🔐 Checking environment variables..."

if [ -f ".env.local" ]; then
  required_vars=(
    "DATABASE_URL"
    "VENICE_API_KEY"
    "MODAL_IMAGE_GEN_URL"
    "NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID"
  )
  
  for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env.local; then
      value=$(grep "^${var}=" .env.local | cut -d'=' -f2 | tr -d '"')
      if [ -n "$value" ] && [ "$value" != "" ]; then
        echo "  ✅ $var is set"
      else
        echo "  ⚠️  $var is empty"
      fi
    else
      echo "  ❌ $var is missing"
    fi
  done
else
  echo "  ❌ .env.local not found"
  echo "  💡 Run: cp .env.example .env.local"
fi

echo ""
echo "🔒 Checking git ignore..."
if git check-ignore .env.local > /dev/null 2>&1; then
  echo "  ✅ .env.local is gitignored"
else
  echo "  ❌ .env.local is NOT gitignored (security risk!)"
fi

echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
  echo "  ✅ node_modules exists"
else
  echo "  ⚠️  node_modules not found"
  echo "  💡 Run: npm install --legacy-peer-deps"
fi

echo ""
echo "🎯 Setup verification complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Review docs/QUICK_REFERENCE.md for common commands"
echo "  2. Run: npm run dev"
echo "  3. Visit: http://localhost:3000"
