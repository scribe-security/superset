#!/bin/bash
set -e

echo "🔷 Stopping any running frontend services..."
docker stop superset_node 2>/dev/null || true

echo "🔷 Cleaning webpack cache..."
docker exec -it superset_app rm -rf /app/superset-frontend/.temp_cache 2>/dev/null || true

echo "🔷 Rebuilding superset-frontend assets..."
# Specify the modified file if needed, or leave empty to rebuild all
MODIFIED_FILE=$1

if [ -n "$MODIFIED_FILE" ]; then
  echo "🔷 Rebuilding for file: $MODIFIED_FILE"
  docker exec -it superset_app touch /app/superset-frontend/$MODIFIED_FILE
fi

# Start the frontend development server
echo "🔷 Starting frontend development server..."
docker compose up -d superset-node

echo "✅ Frontend development server started"
echo "🔍 To check logs: docker compose logs -f superset-node"
echo ""
echo "Now you can refresh your browser to see the changes"
