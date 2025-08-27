#!/bin/bash

# Edge Functions Test Runner
# This script runs all tests for the Edge Functions

set -e

echo "🧪 Running Edge Function Tests..."
echo "=================================="

# Change to the edge directory
cd "$(dirname "$0")"

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "❌ Deno is not installed. Please install Deno first:"
    echo "   curl -fsSL https://deno.land/install.sh | sh"
    exit 1
fi

echo "✅ Deno found: $(deno --version | head -n1)"
echo ""

# Run all tests
echo "📝 Running all tests..."
deno test --allow-net --allow-env --allow-read --no-check

echo ""
echo "🎉 All tests completed!"

# Optionally run with coverage
if [ "$1" = "--coverage" ]; then
    echo ""
    echo "📊 Generating coverage report..."
    deno test --allow-net --allow-env --allow-read --coverage=coverage
    deno coverage coverage
fi
