#!/bin/bash

# Internity PostgreSQL Docker Setup Script
# Sets up a production-ready PostgreSQL database in Docker

set -e

echo "========================================="
echo "  Internity PostgreSQL Docker Setup"
echo "========================================="
echo ""

# Configuration
DB_NAME="internity_db"
DB_USER="internity_user"
DB_PASSWORD="internity_pass"
DB_PORT="5432"
CONTAINER_NAME="internity_postgres"
POSTGRES_VERSION="14-alpine"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper functions
error() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

info() {
    echo -e "→ $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
fi

success "Docker is running"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    warning "Container '${CONTAINER_NAME}' already exists"
    
    read -p "Do you want to remove and recreate it? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Stopping and removing existing container..."
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
        success "Removed existing container"
    else
        warning "Using existing container. Skipping creation."
        
        # Check if container is running
        if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            info "Starting existing container..."
            docker start ${CONTAINER_NAME}
        fi
        
        success "Container is running"
        echo ""
        echo "Connection details:"
        echo "  Host: localhost"
        echo "  Port: ${DB_PORT}"
        echo "  Database: ${DB_NAME}"
        echo "  User: ${DB_USER}"
        echo "  Password: ${DB_PASSWORD}"
        exit 0
    fi
fi

# Create Docker container
info "Creating PostgreSQL container..."
docker run -d \
    --name ${CONTAINER_NAME} \
    -e POSTGRES_DB=${DB_NAME} \
    -e POSTGRES_USER=${DB_USER} \
    -e POSTGRES_PASSWORD=${DB_PASSWORD} \
    -p ${DB_PORT}:5432 \
    -v internity_pgdata:/var/lib/postgresql/data \
    postgres:${POSTGRES_VERSION}

success "PostgreSQL container created"

# Wait for PostgreSQL to be ready
info "Waiting for PostgreSQL to be ready..."
sleep 3

MAX_TRIES=30
COUNTER=0

while ! docker exec ${CONTAINER_NAME} pg_isready -U ${DB_USER} > /dev/null 2>&1; do
    COUNTER=$((COUNTER + 1))
    if [ $COUNTER -gt $MAX_TRIES ]; then
        error "PostgreSQL failed to start after ${MAX_TRIES} attempts"
    fi
    echo -n "."
    sleep 1
done

echo ""
success "PostgreSQL is ready"

# Run schema creation
info "Creating database schema..."
docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < database/schema.sql

if [ $? -eq 0 ]; then
    success "Schema created successfully"
else
    error "Failed to create schema"
fi

# Ask if user wants to seed data
read -p "Do you want to load seed data (demo account)? (Y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    info "Loading seed data..."
    docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} < database/seed.sql
    
    if [ $? -eq 0 ]; then
        success "Seed data loaded successfully"
    else
        warning "Failed to load seed data"
    fi
fi

echo ""
echo "========================================="
echo "  Setup Complete! 🎉"
echo "========================================="
echo ""
echo "PostgreSQL Connection Details:"
echo "  Host: localhost"
echo "  Port: ${DB_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo ""
echo "Connection String:"
echo "  postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
echo ""
echo "Useful Docker Commands:"
echo "  Start container:   docker start ${CONTAINER_NAME}"
echo "  Stop container:    docker stop ${CONTAINER_NAME}"
echo "  View logs:         docker logs ${CONTAINER_NAME}"
echo "  Access psql:       docker exec -it ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}"
echo "  Remove container:  docker rm -f ${CONTAINER_NAME}"
echo ""
echo "Update your backend/.env file:"
echo "  DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
echo ""
