# Learning Loop Implementation

## Overview

The learning loop has been implemented in the `POST /api/outcomes` endpoint. It automatically updates the user skill matrix based on job interactions and provides personalized job recommendations.

## How It Works

### 1. User Interaction Flow
```
User interacts with job → Chrome Extension tracks behavior → POST to /api/outcomes →
Learning Loop updates skill matrix → Returns personalized recommendations
```

### 2. Scoring System

#### Engagement Score (E)
- Computed from behavior metrics: `dwell_time_ms`, `scroll_depth`, `revisit_count`
- Formula: `E = 0.4 * dwellScore + 0.4 * scrollScore + 0.2 * revisitScore`
- Range: 0.0 to 1.0
- Default: 0.5 (if no behavior data provided)

**Normalization:**
- Dwell time: 60s = 1.0 (capped at 120s)
- Scroll depth: Already 0-1
- Revisit count: 1 revisit = 0.5, 2+ = 1.0

#### Outcome Score (O)
- Binary score based on user action
- `O = 1` if outcome is "applied" or "currently_applying"
- `O = 0` if outcome is "not_applied"

#### Interest Score (I)
- Combined score: `I = 0.7 * O + 0.3 * E`
- Weighted toward actual outcomes (applied/applying) but considers engagement

### 3. Skill Matrix Update

The system maintains 34 skill columns in `user_skill_matrix`:
- linux, agile, swift, graphql, ai, cicd, javascript, go, nodejs, aws
- jenkins, git, api, microservices, python, dotnet, typescript, java
- angular, express, sql, html, css, github, scrum, machine_learning
- tensorflow, pytorch, react, azure, google_cloud, docker, kubernetes, rest

For each user outcome:
1. Extract skills from the job's `skills` JSONB array
2. Normalize skill names (handle variations like "Node.js" → "nodejs")
3. Update each metric row (E, O, I) by **adding** the scores to matching skill columns

This creates a cumulative learning profile over time.

### 4. Recommendations

After updating the skill matrix:
1. Query top 8 skills from the Interest (I) metric row
2. Find jobs with the highest overlap count with user's top skills
3. Rank by overlap, return top 10 recommendations
4. Fallback to recent jobs if no skill matches found

## API Usage

### Request Format

**New format (preferred):**
```json
POST /api/outcomes
{
  "anonymous_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_id": 123,
  "outcome": "applied",
  "dwell_time_ms": 42000,
  "scroll_depth": 0.78,
  "revisit_count": 2
}
```

**Legacy format (backward compatible):**
```json
POST /api/outcomes
{
  "anonymous_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_url": "https://linkedin.com/jobs/123",
  "outcome": "currently_applying",
  "metadata": {
    "dwell_time_ms": 30000,
    "scroll_depth": 0.65,
    "revisit_count": 1,
    "source": "linkedin"
  }
}
```

### Response Format

```json
{
  "ok": true,
  "outcome_id": "uuid",
  "job_id": 123,
  "scores": {
    "E": 0.67,
    "O": 1,
    "I": 0.9
  },
  "top_skills": [
    "react",
    "typescript",
    "docker",
    "kubernetes",
    "aws",
    "nodejs",
    "python",
    "sql"
  ],
  "recommendations": [
    {
      "id": 456,
      "job_url": "https://example.com/job/456",
      "title": "Senior Full Stack Developer",
      "company": "Tech Corp",
      "overlap": 6
    }
  ]
}
```

## Implementation Details

### Files Created/Modified

1. **`/backend/helpers/learningLoop.js`** (NEW)
   - `computeEngagementScore()` - Calculates engagement from behavior metrics
   - `updateSkillMatrix()` - Updates user skill matrix for E, O, I metrics
   - `getTopInterestSkills()` - Retrieves top N skills from Interest metric
   - `getRecommendationsByOverlap()` - Gets job recommendations by skill overlap

2. **`/backend/routes/outcomes.js`** (MODIFIED)
   - Integrated learning loop into POST /api/outcomes
   - Maintains backward compatibility with existing format
   - Added comprehensive comments explaining each step

### Database Operations

1. **Ensures matrix rows:** `SELECT ensure_user_skill_matrix_rows($1::uuid)`
2. **Updates skill columns:** Dynamic UPDATE query for matched skills
3. **Unpivots skills:** Uses LATERAL VALUES to query skill columns as rows
4. **Ranks jobs:** JSONB array overlap counting for recommendations

### Skill Normalization

The system handles common skill name variations:
- `Node.js`, `node` → `nodejs`
- `React.js` → `react`
- `GCP` → `google_cloud`
- `k8s` → `kubernetes`
- `C#` → `dotnet`
- `PostgreSQL`, `MySQL` → `sql`

## Testing

### Prerequisites
```bash
cd /home/user/Internity/backend
npm install
```

### Start the server
```bash
npm start
```

### Test the endpoint
```bash
curl -X POST http://localhost:3000/api/outcomes \
  -H "Content-Type: application/json" \
  -d '{
    "anonymous_id": "550e8400-e29b-41d4-a716-446655440000",
    "job_id": 1,
    "outcome": "applied",
    "dwell_time_ms": 45000,
    "scroll_depth": 0.85,
    "revisit_count": 2
  }'
```

## Future Enhancements

For post-hackathon improvements:

1. **ML-based recommendations**: Replace DB overlap with AI scraper agent
2. **Decay function**: Add time-based decay to skill scores
3. **Skill clustering**: Group related skills (e.g., React + TypeScript)
4. **A/B testing**: Test different E/O/I weight combinations
5. **Collaborative filtering**: Consider what similar users applied to
6. **Real-time updates**: WebSocket notifications for new recommendations

## Troubleshooting

**Issue:** No recommendations returned
- Check if jobs have skills populated in the database
- Verify user has some interaction history (outcomes recorded)

**Issue:** Skills not updating
- Check if job skills match the 34 valid columns (see normalization)
- Verify database connection and ensure_user_skill_matrix_rows() function exists

**Issue:** Scores seem off
- Review dwell_time_ms units (should be milliseconds, not seconds)
- Check scroll_depth is 0-1 range (not 0-100 percentage)

## License

Part of the Internity hackathon project.
