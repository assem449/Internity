#!/bin/bash
# Quick database test script for VSCode

echo "Starting database test..."
echo ""

# Check if container exists
if ! docker ps -a | grep -q "internity.*postgres"; then
    echo "Container doesn't exist. Starting it..."
    docker-compose up -d postgres
    echo "Waiting for database to initialize..."
    sleep 8
else
    # Check if container is running
    if ! docker ps | grep -q "internity.*postgres"; then
        echo "Container exists but not running. Starting it..."
        docker-compose start postgres
        echo "Waiting for database to be ready..."
        sleep 5
    else
        echo "Container is already running."
    fi
fi

echo ""
echo "Testing database connection..."
echo "=============================="
echo ""

# Get container name
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -i "internity.*postgres" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "ERROR: Could not find postgres container"
    exit 1
fi

# Test 1: Version
echo "1. PostgreSQL Version:"
docker exec "$CONTAINER_NAME" psql -U postgres -d internity -c "SELECT version();" 2>/dev/null | head -3
echo ""

# Test 2: Tables
echo "2. Database Tables:"
docker exec "$CONTAINER_NAME" psql -U postgres -d internity -c "\dt" 2>/dev/null
echo ""

# Test 3: Job count
echo "3. Job Records:"
docker exec "$CONTAINER_NAME" psql -U postgres -d internity -c "SELECT COUNT(*) as total_jobs FROM jobs;" 2>/dev/null
echo ""

# Test 4: Sample data
echo "4. Sample Jobs:"
docker exec "$CONTAINER_NAME" psql -U postgres -d internity -c "SELECT id, title, company FROM jobs LIMIT 3;" 2>/dev/null
echo ""

echo "=============================="
echo "Database test complete!"
echo ""
echo "To connect interactively:"
echo "  docker exec -it $CONTAINER_NAME psql -U postgres -d internity"
