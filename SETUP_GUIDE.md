# Internity - Complete Setup Guide

Run the entire Internity system: Chrome Extension + Backend + Database + Learning Loop

## System Architecture

```
┌─────────────────┐
│ Chrome Extension│
│  (Frontend)     │
└────────┬────────┘
         │ Tracks user behavior on LinkedIn
         │ (views, clicks, scroll, dwell time)
         ▼
┌─────────────────┐
│  Node.js API    │  ← YOU ARE HERE (Learning Loop implemented!)
│  (Port 3000)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB  │
│  (internity)    │
└─────────────────┘
```

## Quick Start (5 Steps)

### Step 1: Start PostgreSQL Database

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# If not running, start it
sudo service postgresql start

# Create database if it doesn't exist
createdb -U postgres internity

# Run the schema
psql -U postgres -d internity -f /home/user/Internity/database/schema.sql
```

### Step 2: Start Node.js Backend

**Option A: Use the startup script (Recommended)**
```bash
cd /home/user/Internity/backend
./start-system.sh
```

**Option B: Manual start**
```bash
cd /home/user/Internity/backend
npm install
npm start
```

You should see:
```
Server running on port 3000
Database connected successfully
```

### Step 3: Load Chrome Extension

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top right)
4. Click **"Load unpacked"**
5. Navigate to `/home/user/Internity/chrome-extension/`
6. Click **"Select Folder"**

You should see the **Internity** extension loaded with a green checkmark ✓

### Step 4: Test the Backend API

In a new terminal:
```bash
cd /home/user/Internity/backend
./test-learning-loop.sh
```

You should see successful JSON responses with `ok: true`.

### Step 5: Use the Extension on LinkedIn

1. Go to [LinkedIn Jobs](https://www.linkedin.com/jobs/)
2. Open any job posting
3. The extension will track:
   - ✅ Scroll depth (25%, 50%, 75%, 90%, 100%)
   - ✅ Time spent on page (dwell time)
   - ✅ Apply button clicks
   - ✅ Revisit counts

4. When you click "Apply", the extension will:
   - Show a confirmation modal
   - Send outcome data to the backend
   - **Trigger the learning loop!** 🎯

## How to Test the Full Flow

### Test Scenario 1: Apply to a Job

1. **Go to LinkedIn Jobs**
   ```
   https://www.linkedin.com/jobs/
   ```

2. **Open a job posting** and scroll through it

3. **Click "Apply"** or mark as "Not Interested"

4. **Check your browser console** (F12 → Console)
   - You should see extension logs tracking your behavior

5. **Check the backend logs**
   - You should see:
     ```
     [Learning Loop] Scores for user <uuid>, job <id>: { E: 0.67, O: 1, I: 0.9 }
     [Learning Loop] Job skills: ["react", "typescript", ...]
     [Learning Loop] Top interest skills: ["react", "typescript", "docker", ...]
     ```

6. **The learning loop will:**
   - ✅ Calculate engagement score (E) from your scroll depth and time spent
   - ✅ Record outcome score (O = 1 for "applied", 0 for "not applied")
   - ✅ Compute interest score (I = 0.7*O + 0.3*E)
   - ✅ Update your skill matrix for all job skills
   - ✅ Return top 8 skills you're interested in
   - ✅ Return 10 personalized job recommendations

### Test Scenario 2: Manual API Test

You can also test the API directly without the extension:

```bash
# Get a test UUID
TEST_UUID="550e8400-e29b-41d4-a716-446655440000"

# First, add a job to the database
curl -X POST http://localhost:3000/api/jobs/bulk \
  -H "Content-Type: application/json" \
  -d '[{
    "job_url": "https://www.linkedin.com/jobs/view/12345",
    "title": "Full Stack Developer",
    "company": "Tech Corp",
    "skills": ["react", "typescript", "docker", "aws", "nodejs"]
  }]'

# Then, record an outcome (triggers learning loop)
curl -X POST http://localhost:3000/api/outcomes \
  -H "Content-Type: application/json" \
  -d "{
    \"anonymous_id\": \"$TEST_UUID\",
    \"job_id\": 1,
    \"outcome\": \"applied\",
    \"dwell_time_ms\": 45000,
    \"scroll_depth\": 0.85,
    \"revisit_count\": 2
  }"
```

Expected response:
```json
{
  "ok": true,
  "scores": { "E": 0.67, "O": 1, "I": 0.9 },
  "top_skills": ["react", "typescript", "docker", "aws", "nodejs"],
  "recommendations": [...]
}
```

## Verify the Learning Loop

### Check the Database

```bash
# Connect to PostgreSQL
psql -U postgres -d internity

# Check if skill matrix was updated
SELECT * FROM user_skill_matrix
WHERE anonymous_id = '550e8400-e29b-41d4-a716-446655440000';

# See which skills have non-zero values
SELECT
  metric,
  react, typescript, docker, python, aws, nodejs, kubernetes
FROM user_skill_matrix
WHERE anonymous_id = '550e8400-e29b-41d4-a716-446655440000';

# Expected output:
#  metric | react | typescript | docker | python | aws | nodejs | kubernetes
# --------+-------+------------+--------+--------+-----+--------+------------
#  E      |  0.67 |  0.67      |  0.67  |  0     | 0.67|  0.67  |  0
#  O      |  1.0  |  1.0       |  1.0   |  0     | 1.0 |  1.0   |  0
#  I      |  0.9  |  0.9       |  0.9   |  0     | 0.9 |  0.9   |  0

# Check job outcomes
SELECT * FROM job_outcomes
WHERE anonymous_id = '550e8400-e29b-41d4-a716-446655440000';
```

### Check Extension Storage

1. Open Chrome
2. Go to `chrome://extensions/`
3. Find **Internity** extension
4. Click **"Inspect views: service worker"**
5. In the console, run:
   ```javascript
   chrome.storage.local.get(null, (data) => console.log(data))
   ```

You should see stored events and job postings.

## Architecture Overview

### Extension Data Flow

```
User on LinkedIn Job Page
        ↓
contentScript.js tracks:
  • Scroll depth (0-1)
  • Dwell time (milliseconds)
  • Apply button clicks
  • Revisit counts
        ↓
background.js stores events
        ↓
User clicks "Apply"
        ↓
Confirmation modal appears
        ↓
POST /api/outcomes
  {
    anonymous_id: "uuid",
    job_id: 123,
    outcome: "applied",
    dwell_time_ms: 45000,
    scroll_depth: 0.85,
    revisit_count: 2
  }
        ↓
Learning Loop Executes
        ↓
Response with:
  • Scores (E/O/I)
  • Top 8 skills
  • 10 job recommendations
```

### Backend Learning Loop Steps

When `POST /api/outcomes` is called:

1. **Validate input** (UUID, outcome, job_id/job_url)
2. **Get job_id** (lookup or create placeholder)
3. **Upsert job_outcomes** table
4. **Compute scores:**
   - E = engagement from behavior metrics
   - O = 1 for applied/applying, 0 for not_applied
   - I = 0.7*O + 0.3*E
5. **Ensure user_skill_matrix rows** (E/O/I) exist
6. **Fetch job skills** from jobs table
7. **Update skill matrix** (add scores to matching skill columns)
8. **Get top 8 interest skills** (query I metric row)
9. **Get 10 recommendations** (jobs ranked by skill overlap)
10. **Return response** with scores, skills, recommendations

## Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process if needed
kill -9 <PID>

# Check PostgreSQL is running
sudo service postgresql status
```

### Extension not loading
- Make sure you're in Developer mode
- Check for errors in `chrome://extensions/`
- Click "Errors" button on the extension card
- Reload the extension after making changes

### Database connection error
```bash
# Test database connection
psql -U postgres -d internity -c "SELECT 1"

# Check DATABASE_URL in .env
cat /home/user/Internity/backend/.env

# Verify schema is loaded
psql -U postgres -d internity -c "\dt"
```

### Extension not tracking behavior
- Open browser console (F12) on LinkedIn job page
- Check for contentScript.js logs
- Verify you're on a LinkedIn job page (not search results)
- Extension only works on URLs like: `https://www.linkedin.com/jobs/view/*`

### No recommendations returned
- Verify jobs have skills populated in database:
  ```sql
  SELECT id, title, skills FROM jobs LIMIT 5;
  ```
- Check if user has any outcomes recorded:
  ```sql
  SELECT * FROM job_outcomes WHERE anonymous_id = 'your-uuid';
  ```

## Additional Resources

- **Backend Documentation**: `/home/user/Internity/backend/LEARNING_LOOP.md`
- **API Test Script**: `/home/user/Internity/backend/test-learning-loop.sh`
- **Database Schema**: `/home/user/Internity/database/schema.sql`
- **Extension Code**: `/home/user/Internity/chrome-extension/`

## Development Tips

### Watch backend logs
```bash
cd /home/user/Internity/backend
npm run dev  # Uses nodemon for auto-reload
```

### Watch extension console
- Click extension icon in Chrome toolbar
- Right-click → "Inspect popup"
- Or go to `chrome://extensions/` → Click "Inspect views: service worker"

### Reset user data
```sql
-- Delete all data for a user
DELETE FROM job_outcomes WHERE anonymous_id = 'your-uuid';
DELETE FROM user_skill_matrix WHERE anonymous_id = 'your-uuid';
```

### Add test jobs with skills
```bash
curl -X POST http://localhost:3000/api/jobs/bulk \
  -H "Content-Type: application/json" \
  -d '[
    {
      "job_url": "https://example.com/job1",
      "title": "React Developer",
      "company": "TechCo",
      "skills": ["react", "typescript", "nodejs", "docker"]
    },
    {
      "job_url": "https://example.com/job2",
      "title": "Python Engineer",
      "company": "DataCorp",
      "skills": ["python", "aws", "docker", "kubernetes"]
    }
  ]'
```

## What's Next?

After testing the system:

1. **Collect real data**: Use the extension while browsing LinkedIn jobs
2. **Monitor the learning loop**: Watch how your skill matrix evolves
3. **Check recommendations**: See how they improve as you interact with more jobs
4. **Optimize formulas**: Tweak E/O/I weights in `/backend/helpers/learningLoop.js`

## Success Checklist

- [ ] PostgreSQL database running
- [ ] Backend server running on port 3000
- [ ] Chrome extension loaded and active
- [ ] Test API call returns `ok: true`
- [ ] Extension tracks scroll on LinkedIn job pages
- [ ] Apply button click triggers learning loop
- [ ] Skill matrix updates in database
- [ ] Recommendations returned based on skills

🎯 **You're ready to demo your hackathon project!**
