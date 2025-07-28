#!/bin/bash

# Script to set up the development environment properly

set -e

echo "🔧 Setting up Superset development environment..."

# Navigate to the sps3 superset directory
cd /Users/scribe/Projects/sps3/superset

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip first
echo "⬆️  Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Install dependencies
echo "📦 Installing dependencies..."

# Check if requirements/development.txt exists
if [ -f "requirements/development.txt" ]; then
    echo "Installing from requirements/development.txt..."
    pip install -r requirements/development.txt
else
    # If no development requirements, try base requirements
    echo "Installing from requirements/base.txt..."
    pip install -r requirements/base.txt
    
    # Install additional development dependencies
    echo "Installing additional development dependencies..."
    pip install flask-cors
    pip install flask-testing
    pip install pytest
    pip install pytest-cov
fi

# Install Superset in editable mode
echo "📦 Installing Superset in editable mode..."
pip install -e .

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  ./run_dev.sh"
