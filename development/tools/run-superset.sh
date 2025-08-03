#!/bin/bash

# Quick script to run Superset development server
# Connects to LOCAL Docker databases

echo "🚀 Starting Superset Development Server"
echo "======================================"
echo ""

# Navigate to the project directory
cd /Users/scribe/Projects/sps3/superset

# Check if setup has been done
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found!"
    echo "Please run setup first: ./development/tools/setup-dev.sh"
    exit 1
fi

# Source the environment
source .env.development

# Check if databases are running
echo "🐳 Checking Docker containers..."

if ! docker ps | grep -q "7432->5432"; then
    echo "❌ Metadata database not running on port 7432!"
    echo "Please ensure Docker containers are running"
    exit 1
fi

if ! docker ps | grep -q "5432->5432"; then
    echo "❌ Data source database not running on port 5432!"
    echo "Please ensure Docker containers are running"
    exit 1
fi

echo "✅ Docker databases are running"
echo ""
echo "📊 Database connections:"
echo "   Metadata: localhost:7432/superset"
echo "   Data Source: localhost:5432/airflow"
echo ""
echo "🌐 Server will be available at: http://localhost:8088"
echo "👤 Login with existing users from docker-init.sh"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run Superset with debug and reload
superset run -p 8088 --with-threads --reload --debugger --host 0.0.0.0
