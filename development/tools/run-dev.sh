#!/bin/bash

# Development runner for sps3 Superset fork
# This script connects to the existing databases from scribe2

set -e

echo "🚀 Starting Superset development environment..."

# Check if both databases are accessible
echo "📊 Checking database connections..."

# Check Airflow database
if ! nc -z localhost 5432; then
    echo "❌ Airflow database is not running on port 5432"
    echo "Please ensure the main services are running:"
    echo "  cd /Users/scribe/Projects/scribe2"
    echo "  docker compose up -d postgres redis"
    exit 1
fi

# Check Superset database
if ! nc -z localhost 7432; then
    echo "❌ Superset database is not running on port 7432"
    echo "Please run './fix_db_setup.sh' first"
    exit 1
fi

# Check Redis
echo "🔄 Checking Redis connection..."
if ! nc -z localhost 6379; then
    echo "❌ Redis is not running on port 6379"
    echo "Please ensure Redis is running:"
    echo "  cd /Users/scribe/Projects/scribe2"
    echo "  docker compose up -d redis"
    exit 1
fi

# Navigate to the sps3 superset directory
cd /Users/scribe/Projects/sps3/superset

# Source MySQL environment if it exists
if [ -f ".env.mysql" ]; then
    echo "🔧 Loading MySQL environment..."
    source .env.mysql
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🐍 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  No virtual environment found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Check if flask-cors is installed
if ! python -c "import flask_cors" 2>/dev/null; then
    echo "📦 Installing missing dependencies..."
    pip install --upgrade pip setuptools wheel
    
    # Ensure MySQL environment is set for mysqlclient
    if [ -f ".env.mysql" ]; then
        source .env.mysql
    fi
    
    pip install -r requirements/development.txt
    pip install -e .
fi

# Set environment variables
export FLASK_APP=superset
export SUPERSET_CONFIG_PATH=/Users/scribe/Projects/sps3/superset/development/config/superset_config_dev.py
export FLASK_ENV=development
export SUPERSET_ENV=development

# CRITICAL: Set required environment variables for superset_config_base.py
export SUPERSET_SECRET_KEY='dev-secret-key-change-in-production-$(date +%s)'
export SUPERSET_DATABASE_URI='postgresql://airflow:airflow@localhost:7432/superset'
export REDIS_HOST='localhost'
export REDIS_PORT='6379'
export REDIS_DB='0'
export CSRF_ENABLED='false'  # Only for development

echo "🔐 Environment variables set:"
echo "   SUPERSET_SECRET_KEY: [SET]"
echo "   SUPERSET_DATABASE_URI: postgresql://...@localhost:7432/superset"
echo "   REDIS_HOST: localhost:6379"

# Initialize Superset (only needs to be done once)
if [ "$1" == "init" ]; then
    echo "🔧 Initializing Superset..."
    superset db upgrade
    superset init
    
    # Add the Airflow database connection
    echo "📊 Adding Airflow database connection..."
    superset set-database-uri -d "Airflow" -u "postgresql://airflow:airflow@localhost:5432/airflow"
fi

# Start the Flask development server
echo "🌐 Starting Flask development server..."
echo "Access Superset at: http://localhost:8088"
echo "Login with: admin / superset"
echo ""
echo "📊 Database connections:"
echo "- Airflow DB (data source): postgresql://airflow:airflow@localhost:5432/airflow"
echo "- Superset DB (metadata): postgresql://airflow:airflow@localhost:7432/superset"
echo ""
echo "Press Ctrl+C to stop"

# Use Flask's development server for hot reloading
flask run -p 8088 --with-threads --reload --debugger
