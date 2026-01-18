#!/bin/bash

# Demo: See Job Recommendations Based on Applications
# ====================================================
# This script demonstrates the learning loop by:
# 1. Adding sample jobs to the database
# 2. Simulating job applications
# 3. Showing personalized recommendations

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

API_URL="http://localhost:3000"
TEST_UUID="550e8400-e29b-41d4-a716-446655440000"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Learning Loop Demo - Job Recommendations              ║${NC}"
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check if server is running
if ! curl -s $API_URL/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Server not running. Start it with: npm start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Server is running!${NC}"
echo ""

# Step 1: Seed database with sample jobs
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Adding Sample Jobs to Database${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

curl -s -X POST $API_URL/api/jobs/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {
      "job_url": "https://example.com/job/react-dev-1",
      "title": "Senior React Developer",
      "company": "TechCorp Inc",
      "location": "San Francisco, CA",
      "skills": ["react", "typescript", "nodejs", "docker", "aws"]
    },
    {
      "job_url": "https://example.com/job/fullstack-1",
      "title": "Full Stack Engineer",
      "company": "StartupXYZ",
      "location": "New York, NY",
      "skills": ["react", "nodejs", "python", "sql", "docker"]
    },
    {
      "job_url": "https://example.com/job/python-ml-1",
      "title": "ML Engineer",
      "company": "AI Labs",
      "location": "Boston, MA",
      "skills": ["python", "tensorflow", "pytorch", "aws", "docker"]
    },
    {
      "job_url": "https://example.com/job/devops-1",
      "title": "DevOps Engineer",
      "company": "CloudOps Co",
      "location": "Austin, TX",
      "skills": ["kubernetes", "docker", "aws", "python", "jenkins"]
    },
    {
      "job_url": "https://example.com/job/frontend-1",
      "title": "Frontend Developer",
      "company": "DesignHub",
      "location": "Seattle, WA",
      "skills": ["react", "typescript", "html", "css", "javascript"]
    },
    {
      "job_url": "https://example.com/job/backend-java-1",
      "title": "Backend Java Developer",
      "company": "Enterprise Corp",
      "location": "Chicago, IL",
      "skills": ["java", "sql", "api", "microservices", "docker"]
    },
    {
      "job_url": "https://example.com/job/data-eng-1",
      "title": "Data Engineer",
      "company": "DataFlow Inc",
      "location": "Denver, CO",
      "skills": ["python", "sql", "aws", "docker", "api"]
    },
    {
      "job_url": "https://example.com/job/cloud-arch-1",
      "title": "Cloud Architect",
      "company": "CloudFirst",
      "location": "Remote",
      "skills": ["aws", "kubernetes", "docker", "python", "terraform"]
    },
    {
      "job_url": "https://example.com/job/mobile-ios-1",
      "title": "iOS Developer",
      "company": "MobileApps Co",
      "location": "Los Angeles, CA",
      "skills": ["swift", "api", "git", "cicd"]
    },
    {
      "job_url": "https://example.com/job/sre-1",
      "title": "Site Reliability Engineer",
      "company": "ReliableOps",
      "location": "Portland, OR",
      "skills": ["kubernetes", "docker", "python", "aws", "jenkins"]
    }
  ]' > /dev/null

echo -e "${GREEN}✓ Added 10 sample jobs to database${NC}"
echo ""

# Step 2: Simulate applying to React/TypeScript jobs
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Simulating Your Job Applications${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${MAGENTA}📝 Applying to: Senior React Developer @ TechCorp${NC}"
echo "   Skills: react, typescript, nodejs, docker, aws"
echo "   Engagement: High (scrolled 85%, spent 3 mins, visited 2x)"
echo ""

curl -s -X POST $API_URL/api/outcomes \
  -H "Content-Type: application/json" \
  -d "{
    \"anonymous_id\": \"$TEST_UUID\",
    \"job_id\": 1,
    \"outcome\": \"applied\",
    \"dwell_time_ms\": 180000,
    \"scroll_depth\": 0.85,
    \"revisit_count\": 2
  }" > /dev/null

sleep 1

echo -e "${MAGENTA}📝 Applying to: Full Stack Engineer @ StartupXYZ${NC}"
echo "   Skills: react, nodejs, python, sql, docker"
echo "   Engagement: Medium (scrolled 70%, spent 2 mins, visited 1x)"
echo ""

curl -s -X POST $API_URL/api/outcomes \
  -H "Content-Type: application/json" \
  -d "{
    \"anonymous_id\": \"$TEST_UUID\",
    \"job_id\": 2,
    \"outcome\": \"applied\",
    \"dwell_time_ms\": 120000,
    \"scroll_depth\": 0.70,
    \"revisit_count\": 1
  }" > /dev/null

sleep 1

echo -e "${MAGENTA}📝 Currently Applying: Frontend Developer @ DesignHub${NC}"
echo "   Skills: react, typescript, html, css, javascript"
echo "   Engagement: High (scrolled 90%, spent 4 mins, visited 3x)"
echo ""

RESPONSE=$(curl -s -X POST $API_URL/api/outcomes \
  -H "Content-Type: application/json" \
  -d "{
    \"anonymous_id\": \"$TEST_UUID\",
    \"job_id\": 5,
    \"outcome\": \"currently_applying\",
    \"dwell_time_ms\": 240000,
    \"scroll_depth\": 0.90,
    \"revisit_count\": 3
  }")

echo ""
echo -e "${GREEN}✓ Submitted 3 job applications${NC}"
echo ""

# Step 3: Display the learning loop results
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Learning Loop Results${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Parse and display scores
E_SCORE=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['scores']['E'])" 2>/dev/null || echo "N/A")
O_SCORE=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['scores']['O'])" 2>/dev/null || echo "N/A")
I_SCORE=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['scores']['I'])" 2>/dev/null || echo "N/A")

echo -e "${CYAN}📊 Your Interest Scores:${NC}"
echo "   Engagement (E): $E_SCORE"
echo "   Outcome (O):    $O_SCORE"
echo "   Interest (I):   $I_SCORE"
echo ""

# Display top skills
echo -e "${CYAN}🎯 Your Top Skills (based on applications):${NC}"
TOP_SKILLS=$(echo $RESPONSE | python3 -c "import sys, json; print(', '.join(json.load(sys.stdin)['top_skills']))" 2>/dev/null || echo "N/A")
echo "   $TOP_SKILLS"
echo ""

# Display recommendations
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌟 Personalized Job Recommendations For You${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo $RESPONSE | python3 << 'EOF'
import sys
import json

try:
    data = json.load(sys.stdin)
    recommendations = data.get('recommendations', [])

    if not recommendations:
        print("No recommendations found.")
    else:
        for i, job in enumerate(recommendations[:10], 1):
            print(f"\033[1;33m{i}. {job['title']}\033[0m")
            print(f"   Company: {job['company']}")
            print(f"   URL: {job['job_url']}")
            print(f"   \033[0;32m✓ Skill Match: {job['overlap']} skills overlap with your interests\033[0m")
            print()
except Exception as e:
    print(f"Error parsing recommendations: {e}")
EOF

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Demo Complete!${NC}"
echo ""
echo -e "${CYAN}What just happened?${NC}"
echo "1. You applied to 3 jobs with React, TypeScript, Node.js skills"
echo "2. The learning loop calculated your interest scores (E/O/I)"
echo "3. Your skill matrix was updated with higher scores for:"
echo "   react, typescript, nodejs, docker, html, css, javascript"
echo "4. Jobs were ranked by how many skills they share with you"
echo "5. The recommendations are personalized based on YOUR applications!"
echo ""
echo -e "${YELLOW}💡 Try applying to different jobs to see recommendations change!${NC}"
echo ""
