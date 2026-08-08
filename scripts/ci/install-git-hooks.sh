#!/bin/bash
# Install git hooks for pre-push checks

echo "Installing git hooks..."

# Create pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

echo "🔍 Running pre-push checks..."

# Run full TypeScript type checking
echo "📝 Running TypeScript type checking..."
pnpm type-check
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ TypeScript type checking failed!"
  echo "   Run 'pnpm type-check' to see all errors."
  echo "   Fix type errors before pushing."
  exit 1
fi

echo ""
echo "✅ Pre-push checks passed!"
EOF

chmod +x .git/hooks/pre-push

echo "✅ Git hooks installed successfully!"
echo "Full TypeScript type checking will run before every push."
echo ""
echo "Note: If type checking has too many errors, you can:"
echo "  1. Fix the type errors in your code"
echo "  2. Or temporarily bypass the hook with: git push --no-verify"
