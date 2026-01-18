#!/bin/bash

echo "🧪 Testing Learning Loop Implementation"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}Checking if server is running on port 3000...${NC}"
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}Server not running. Start it with: npm start${NC}"
    echo ""
    echo "Run this in another terminal first:"
    echo "  cd /home/user/Internity/backend"
    echo "  npm install"
    echo "  npm start"
    exit 1
fi

echo -e "${GREEN}✓ Server is running!${NC}"
echo ""

# Generate a test UUID
TEST_UUID="550e8400-e29b-41d4-a716-446655440000"

# Test 1: POST outcome with job_id
echo -e "${BLUE}Test 1: POST outcome with job_id (new format)${NC}"
echo "Request:"
cat << EOF
{
  "anonymous_id": "$TEST_UUID",
  "job_id": 1,
  "outcome": "applied",
  "dwell_time_ms": 45000,
  "scroll_depth": 0.85,
  "revisit_count": 2
}
EOF
echo ""
echo "Response:"

curl -X POST http://localhost:3000/api/outcomes \
  -H "Content-Type: application/json" \
  -d "{
    \"anonymous_id\": \"$TEST_UUID\",
    \"job_id\": 1,
    \"outcome\": \"applied\",
    \"dwell_time_ms\": 45000,
    \"scroll_depth\": 0.85,
    \"revisit_count\": 2
  }" 2>/dev/null | python3 -m json.tool

echo ""
echo "========================================"
echo ""

# Test 2: POST outcome with different engagement
echo -e "${BLUE}Test 2: Lower engagement (not_applied)${NC}"
echo "Request:"
cat << EOF
{
  "anonymous_id": "$TEST_UUID",
  "job_id": 2,
  "outcome": "not_applied",
  "dwell_time_ms": 5000,
  "scroll_depth": 0.2,
  "revisit_count": 0
}
EOF
echo ""
echo "Response:"

curl -X POST http://localhost:3000/api/outcomes \
  -H "Content-Type: application/json" \
  -d "{
    \"anonymous_id\": \"$TEST_UUID\",
    \"job_id\": 2,
    \"outcome\": \"not_applied\",
    \"dwell_time_ms\": 5000,
    \"scroll_depth\": 0.2,
    \"revisit_count\": 0
  }" 2>/dev/null | python3 -m json.tool

echo ""
echo "========================================"
echo ""

# Test 3: Legacy format with job_url
echo -e "${BLUE}Test 3: Legacy format with job_url${NC}"
echo "Request:"
cat << EOF
{
  "anonymous_id": "$TEST_UUID",
  "job_url": "https://www.linkedin.com/jobs/view/test-12345",
  "outcome": "currently_applying",
  "metadata": {
    "dwell_time_ms": 30000,
    "scroll_depth": 0.65,
    "revisit_count": 1,
    "source": "linkedin"
  }
}
EOF
echo ""
echo "Response:"

curl -X POST http://localhost:3000/api/outcomes \
  -H "Content-Type: application/json" \
  -d "{
    \"anonymous_id\": \"$TEST_UUID\",
    \"job_url\": \"https://www.linkedin.com/jobs/view/test-12345\",
    \"outcome\": \"currently_applying\",
    \"metadata\": {
      \"dwell_time_ms\": 30000,
      \"scroll_depth\": 0.65,
      \"revisit_count\": 1,
      \"source\": \"linkedin\"
    }
  }" 2>/dev/null | python3 -m json.tool

echo ""
echo "========================================"
echo -e "${GREEN}✓ All tests complete!${NC}"
echo ""
echo "Check the responses above for:"
echo "  • 'ok': true"
echo "  • 'scores': { E, O, I }"
echo "  • 'top_skills': [...]"
echo "  • 'recommendations': [...]"
