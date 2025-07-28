#!/bin/bash

# Debug script to check database connections

echo "🔍 Checking Database Connections"
echo "================================"

# Check if PostgreSQL is installed locally
if command -v psql &> /dev/null; then
    echo "✅ psql command found"
else
    echo "❌ psql command not found. Install with: brew install postgresql"
    exit 1
fi

echo ""
echo "📊 Checking Airflow Database (port 5432)..."
if nc -z localhost 5432 2>/dev/null; then
    echo "✅ Port 5432 is open"
    
    # Try to connect and list databases
    echo "   Databases available:"
    PGPASSWORD=airflow psql -h localhost -p 5432 -U airflow -l 2>/dev/null | grep -E "airflow|superset" || echo "   ❌ Could not connect"
else
    echo "❌ Port 5432 is not open"
fi

echo ""
echo "📊 Checking Superset Database (port 7432)..."
if nc -z localhost 7432 2>/dev/null; then
    echo "✅ Port 7432 is open"
    
    # Try to connect and list databases
    echo "   Databases available:"
    PGPASSWORD=airflow psql -h localhost -p 7432 -U airflow -l 2>/dev/null | grep -E "airflow|superset" || echo "   ❌ Could not connect"
else
    echo "❌ Port 7432 is not open"
fi

echo ""
echo "🔄 Checking Redis (port 6379)..."
if nc -z localhost 6379 2>/dev/null; then
    echo "✅ Port 6379 is open"
else
    echo "❌ Port 6379 is not open"
fi

echo ""
echo "🐳 Docker containers running:"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "postgres|db|redis" || echo "No database containers found"

echo ""
echo "💡 Tips:"
echo "   - If Airflow DB is missing, run: cd /Users/scribe/Projects/scribe2 && docker compose up -d postgres"
echo "   - If Superset DB is missing, run: cd /Users/scribe/Projects/scribe2 && make superset-start"
echo "   - To connect manually: PGPASSWORD=airflow psql -h localhost -p <port> -U airflow -d <database>"
