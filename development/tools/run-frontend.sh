#!/bin/bash

# Frontend development runner for sps3 Superset fork

set -e

echo "🎨 Starting Superset frontend development environment..."

# Navigate to the frontend directory
cd /Users/scribe/Projects/sps3/superset/superset-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm ci
fi

# Start the webpack dev server
echo "🚀 Starting webpack dev server..."
echo "Frontend will be available at: http://localhost:9000"
echo "It will proxy API requests to the backend at http://localhost:8088"
echo "Press Ctrl+C to stop"

npm run dev-server
