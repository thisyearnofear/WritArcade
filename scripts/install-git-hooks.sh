#!/bin/bash
# Install git hooks for pre-push checks

echo "Installing git hooks..."

# Create pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

echo "🔍 Running pre-push checks..."

# Check TypeScript compilation
echo "📝 Checking TypeScript..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed. Fix errors before pushing."
  exit 1
fi

echo "✅ Pre-push checks passed!"
EOF

chmod +x .git/hooks/pre-push

echo "✅ Git hooks installed successfully!"
echo "TypeScript will be checked before every push."
