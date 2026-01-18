#!/bin/bash

# Internity - Complete System Startup Guide
# ==========================================
# This script helps you start all components of Internity:
# 1. PostgreSQL Database
# 2. Node.js Backend (port 3000)
# 3. Python Flask Backend (port 5000) - for skill extraction
# 4. Chrome Extension (manual step)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Internity System Startup"
echo "============================="
echo ""

# Check current directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the /home/user/Internity/backend directory${NC}"
    exit 1
fi

# Step 1: Check PostgreSQL
echo -e "${BLUE}[1/4] Checking PostgreSQL Database...${NC}"
if command -v psql &> /dev/null; then
    if psql -U postgres -d internity -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL is running and 'internity' database exists${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL is installed but 'internity' database may not exist${NC}"
        echo "Create it with: createdb -U postgres internity"
        echo "Or run the schema: psql -U postgres -d internity -f ../database/schema.sql"
    fi
else
    echo -e "${RED}✗ PostgreSQL is not installed or not in PATH${NC}"
    echo "Install it first: sudo apt-get install postgresql"
    exit 1
fi
echo ""

# Step 2: Install Node.js dependencies
echo -e "${BLUE}[2/4] Installing Node.js dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# Step 3: Check environment variables
echo -e "${BLUE}[3/4] Checking environment configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    cat .env
else
    echo -e "${YELLOW}⚠ Creating .env file...${NC}"
    cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internity
PORT=3000
NODE_ENV=development
RECOMMENDER_URL=http://localhost:8000
EOF
    echo -e "${GREEN}✓ Created .env file with defaults${NC}"
fi
echo ""

# Step 4: Start Node.js backend
echo -e "${BLUE}[4/4] Starting Node.js Backend...${NC}"
echo ""
echo -e "${YELLOW}Starting server on port 3000...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm start
