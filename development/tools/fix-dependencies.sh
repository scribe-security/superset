#!/bin/bash

# Quick fix for missing dependencies

echo "🔧 Fixing missing dependencies..."

cd /Users/scribe/Projects/sps3/superset

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Install flask-cors and other missing dependencies
echo "📦 Installing flask-cors and other dependencies..."
pip install flask-cors

# Check if it worked
if python -c "import flask_cors" 2>/dev/null; then
    echo "✅ flask-cors installed successfully!"
else
    echo "❌ Failed to install flask-cors"
    echo "Trying complete reinstall..."
    pip install --upgrade pip setuptools wheel
    pip install -r requirements/development.txt
    pip install -e .
fi

echo ""
echo "✅ Dependencies fixed!"
echo "Now run: ./run_dev.sh"
