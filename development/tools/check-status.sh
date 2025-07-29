#!/bin/bash

# Quick status check for Superset development environment

echo "🔍 Checking Superset Development Environment Status"
echo "=================================================="
echo ""

# Check Docker containers
echo "📦 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep -E "(superset|scribe2|NAMES)"
echo ""

# Check port availability
echo "🔌 Port Status:"
echo -n "  Port 5432 (Airflow DB): "
if lsof -i :5432 > /dev/null 2>&1; then
    echo "✅ In use"
else
    echo "❌ Not in use"
fi

echo -n "  Port 7432 (Superset DB): "
if lsof -i :7432 > /dev/null 2>&1; then
    echo "✅ In use"
else
    echo "❌ Not in use"
fi

echo -n "  Port 6379 (Redis): "
if lsof -i :6379 > /dev/null 2>&1; then
    echo "✅ In use"
else
    echo "❌ Not in use"
fi

echo -n "  Port 8088 (Superset): "
if lsof -i :8088 > /dev/null 2>&1; then
    echo "✅ In use"
else
    echo "❌ Not in use (normal if not started yet)"
fi
echo ""

# Test database connections
echo "🗄️  Database Connections:"
echo -n "  Airflow DB: "
if PGPASSWORD=airflow psql -h localhost -p 5432 -U airflow -d airflow -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Cannot connect"
fi

echo -n "  Superset DB: "
if PGPASSWORD=airflow psql -h localhost -p 7432 -U airflow -d superset -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Cannot connect"
fi

echo -n "  Redis: "
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Cannot connect"
fi
echo ""

# Check virtual environment
echo "🐍 Python Environment:"
if [ -d "/Users/scribe/Projects/sps3/superset/venv" ]; then
    echo "  Virtual environment: ✅ Exists"
else
    echo "  Virtual environment: ❌ Not found (run setup-dev.sh)"
fi
echo ""

# Summary
echo "📊 Summary:"
if lsof -i :5432 > /dev/null 2>&1 && lsof -i :7432 > /dev/null 2>&1 && lsof -i :6379 > /dev/null 2>&1; then
    echo "  ✅ All required services are running!"
    echo ""
    echo "  To start Superset development server:"
    echo "    cd /Users/scribe/Projects/sps3/superset"
    echo "    ./development/tools/run-dev.sh"
else
    echo "  ❌ Some services are missing. Run:"
    echo "    cd /Users/scribe/Projects/sps3/superset/development/tools"
    echo "    ./start-services.sh"
fi
echo ""
