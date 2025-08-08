#!/bin/bash

echo "🧪 Running Caddy Manager Repository Integration Tests"
echo "=================================================="
echo "📝 Test Coverage Includes:"
echo "   • Caddy Servers Repository"
echo "   • Caddy Config Repository" 
echo "   • Caddy Service Integration"
echo "   • Caddy Controller (HTTP Layer)"
echo "   • Audit Log Repository"
echo "   • Audit Service"
echo ""

# Test with SQLite
echo "📦 Testing with SQLite Database Engine..."
DB_ENGINE=sqlite npm test

if [ $? -eq 0 ]; then
    echo "✅ SQLite tests passed!"
else
    echo "❌ SQLite tests failed!"
    exit 1
fi

# Test with MongoDB (if available)
echo ""
echo "🍃 Testing with MongoDB Database Engine..."
if command -v mongod >/dev/null 2>&1; then
    echo "MongoDB found, running MongoDB tests..."
    DB_ENGINE=mongo npm test
    
    if [ $? -eq 0 ]; then
        echo "✅ MongoDB tests passed!"
    else
        echo "❌ MongoDB tests failed!"
        exit 1
    fi
else
    echo "⚠️  MongoDB not found, skipping MongoDB tests"
fi

echo ""
echo "🎉 All database engine tests completed successfully!"
echo ""
echo "📊 Running coverage report..."
npm run test:coverage
