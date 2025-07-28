#!/bin/bash

# Simple start script for Superset development
# This ensures proper database setup

set -e

echo "🚀 Starting Superset Development Environment"
echo "=========================================="

# Navigate to scribe2
cd /Users/scribe/Projects/scribe2

# Step 1: Ensure Airflow database is running
echo "📊 Starting Airflow database..."
docker compose up -d postgres redis

# Wait for database
echo "⏳ Waiting for Airflow database..."
until docker compose exec postgres pg_isready -U airflow 2>/dev/null; do
    sleep 1
    echo -n "."
done
echo " ✅"

# Step 2: Start Superset (this will handle the init automatically)
echo "🎨 Starting Superset services..."
make superset-start

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📊 Databases:"
echo "   - Airflow DB: postgresql://airflow:airflow@localhost:5432/airflow"
echo "   - Superset DB: postgresql://airflow:airflow@localhost:7432/superset"
echo ""
echo "🌐 Access Superset at: http://localhost:8088"
echo "👤 Login: admin / superset"
echo ""
echo "To start development servers, run:"
echo "   cd /Users/scribe/Projects/sps3/superset"
echo "   ./run_dev.sh"
