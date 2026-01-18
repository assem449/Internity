const db = require('../db');

// List of all 34 valid skill columns in user_skill_matrix
const VALID_SKILLS = [
  'linux', 'agile', 'swift', 'graphql', 'ai', 'cicd', 'javascript', 'go',
  'nodejs', 'aws', 'jenkins', 'git', 'api', 'microservices', 'python',
  'dotnet', 'typescript', 'java', 'angular', 'express', 'sql', 'html',
  'css', 'github', 'scrum', 'machine_learning', 'tensorflow', 'pytorch',
  'react', 'azure', 'google_cloud', 'docker', 'kubernetes', 'rest'
];

/**
 * Compute Engagement score from behavior metrics
 * Hackathon simple formula with clamping
 *
 * @param {Object} params - Behavior parameters
 * @param {number} params.dwell_time_ms - Time spent on job page in ms
 * @param {number} params.scroll_depth - Scroll depth 0-1
 * @param {number} params.revisit_count - Number of revisits
 * @returns {number} Engagement score 0-1
 */
function computeEngagementScore({ dwell_time_ms, scroll_depth, revisit_count }) {
  // If no data provided, return default
  if (dwell_time_ms === undefined && scroll_depth === undefined && revisit_count === undefined) {
    return 0.5;
  }

  // Normalize dwell time (assume 60s = 1.0, cap at 120s)
  const dwellScore = dwell_time_ms ? Math.min(dwell_time_ms / 60000, 1.0) : 0;

  // Scroll depth already 0-1
  const scrollScore = scroll_depth !== undefined ? scroll_depth : 0;

  // Normalize revisit count (1 revisit = 0.5, 2+ = 1.0)
  const revisitScore = revisit_count ? Math.min(revisit_count * 0.5, 1.0) : 0;

  // Weighted average: 40% dwell, 40% scroll, 20% revisit
  const engagement = (dwellScore * 0.4) + (scrollScore * 0.4) + (revisitScore * 0.2);

  // Clamp to 0-1
  return Math.max(0, Math.min(1, engagement));
}

/**
 * Update user_skill_matrix with E, O, I scores for matching job skills
 *
 * @param {string} anonymousId - User UUID
 * @param {Array<string>} jobSkills - Skills from the job (from jobs.skills JSONB)
 * @param {Object} scores - Computed scores { E, O, I }
 * @returns {Promise<void>}
 */
async function updateSkillMatrix(anonymousId, jobSkills, scores) {
  // Filter job skills to only include valid matrix columns
  // Normalize skill names to lowercase and handle variations
  const matchedSkills = jobSkills
    .map(skill => {
      // Normalize: lowercase, replace spaces/hyphens with underscore
      const normalized = skill.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_')
        .replace(/\./g, '');

      // Direct match or common variations
      const variations = {
        'c#': 'dotnet',
        'node': 'nodejs',
        'node.js': 'nodejs',
        'reactjs': 'react',
        'gcp': 'google_cloud',
        'k8s': 'kubernetes',
        'ci/cd': 'cicd',
        'ci_cd': 'cicd',
        'ml': 'machine_learning',
        'restful': 'rest',
        'rest_api': 'rest',
        'postgresql': 'sql',
        'mysql': 'sql',
        'mongodb': 'sql',
        'database': 'sql'
      };

      // Check variations first
      if (variations[normalized]) {
        return variations[normalized];
      }

      // Check if it's a valid skill
      if (VALID_SKILLS.includes(normalized)) {
        return normalized;
      }

      return null;
    })
    .filter(skill => skill !== null);

  if (matchedSkills.length === 0) {
    console.log('No matching skills found for skill matrix update');
    return;
  }

  console.log(`Updating skill matrix for ${matchedSkills.length} skills:`, matchedSkills);

  // Update each metric (E, O, I) with the matched skills
  for (const metric of ['E', 'O', 'I']) {
    const score = scores[metric];

    // Build dynamic UPDATE query
    // UPDATE user_skill_matrix SET skill1 = skill1 + $1, skill2 = skill2 + $1, ...
    const skillUpdates = matchedSkills.map((skill, idx) => `${skill} = ${skill} + $${idx + 3}`);

    const query = `
      UPDATE user_skill_matrix
      SET ${skillUpdates.join(', ')},
          updated_at = CURRENT_TIMESTAMP
      WHERE anonymous_id = $1 AND metric = $2
    `;

    // Build params: [anonymousId, metric, score, score, score, ...]
    const params = [anonymousId, metric, ...Array(matchedSkills.length).fill(score)];

    await db.query(query, params);
  }
}

/**
 * Get top N skills from user's Interest (I) metric row
 * Uses SQL unpivot technique to get skill columns as rows
 *
 * @param {string} anonymousId - User UUID
 * @param {number} limit - Number of top skills to return (default 8)
 * @returns {Promise<Array<string>>} Array of skill names sorted by interest score
 */
async function getTopInterestSkills(anonymousId, limit = 8) {
  // Unpivot the skill columns using VALUES to get column names and scores
  const query = `
    WITH skill_scores AS (
      SELECT skill_name, skill_value
      FROM user_skill_matrix,
      LATERAL (
        VALUES
          ('linux', linux),
          ('agile', agile),
          ('swift', swift),
          ('graphql', graphql),
          ('ai', ai),
          ('cicd', cicd),
          ('javascript', javascript),
          ('go', go),
          ('nodejs', nodejs),
          ('aws', aws),
          ('jenkins', jenkins),
          ('git', git),
          ('api', api),
          ('microservices', microservices),
          ('python', python),
          ('dotnet', dotnet),
          ('typescript', typescript),
          ('java', java),
          ('angular', angular),
          ('express', express),
          ('sql', sql),
          ('html', html),
          ('css', css),
          ('github', github),
          ('scrum', scrum),
          ('machine_learning', machine_learning),
          ('tensorflow', tensorflow),
          ('pytorch', pytorch),
          ('react', react),
          ('azure', azure),
          ('google_cloud', google_cloud),
          ('docker', docker),
          ('kubernetes', kubernetes),
          ('rest', rest)
      ) AS skills(skill_name, skill_value)
      WHERE anonymous_id = $1 AND metric = 'I'
    )
    SELECT skill_name
    FROM skill_scores
    WHERE skill_value > 0
    ORDER BY skill_value DESC
    LIMIT $2
  `;

  const result = await db.query(query, [anonymousId, limit]);
  return result.rows.map(row => row.skill_name);
}

/**
 * Get job recommendations based on skill overlap
 * DB-only fallback for hackathon (no AI scraper agent)
 *
 * @param {Array<string>} skillsContext - Top skills from user interest
 * @param {number} limit - Number of recommendations (default 10)
 * @param {string} excludeJobId - Optional job ID to exclude from results
 * @returns {Promise<Array<Object>>} Array of job recommendations with overlap counts
 */
async function getRecommendationsByOverlap(skillsContext, limit = 10, excludeJobId = null) {
  if (skillsContext.length === 0) {
    // If no skills yet, return recent jobs
    const query = `
      SELECT id, job_url, title, company, skills, 0 as overlap
      FROM jobs
      WHERE skills IS NOT NULL AND jsonb_array_length(skills) > 0
      ${excludeJobId ? 'AND id != $2' : ''}
      ORDER BY scraped_at DESC
      LIMIT $1
    `;

    const params = excludeJobId ? [limit, excludeJobId] : [limit];
    const result = await db.query(query, params);
    return result.rows;
  }

  // Count overlap between job skills and user's top skills
  // Uses JSONB operators: ?| checks if any array element matches
  const query = `
    WITH job_overlaps AS (
      SELECT
        id,
        job_url,
        title,
        company,
        skills,
        (
          SELECT COUNT(*)
          FROM jsonb_array_elements_text(skills) AS skill
          WHERE LOWER(skill) = ANY($2::text[])
        ) as overlap
      FROM jobs
      WHERE skills IS NOT NULL
        AND jsonb_array_length(skills) > 0
        ${excludeJobId ? 'AND id != $3' : ''}
    )
    SELECT id, job_url, title, company, skills, overlap
    FROM job_overlaps
    WHERE overlap > 0
    ORDER BY overlap DESC, id DESC
    LIMIT $1
  `;

  const params = excludeJobId
    ? [limit, skillsContext, excludeJobId]
    : [limit, skillsContext];

  const result = await db.query(query, params);

  // If we don't have enough matches, fill with recent jobs
  if (result.rows.length < limit) {
    const remaining = limit - result.rows.length;
    const excludeIds = result.rows.map(r => r.id);
    if (excludeJobId) excludeIds.push(parseInt(excludeJobId));

    const fillQuery = `
      SELECT id, job_url, title, company, skills, 0 as overlap
      FROM jobs
      WHERE skills IS NOT NULL
        AND jsonb_array_length(skills) > 0
        AND id != ALL($1::int[])
      ORDER BY scraped_at DESC
      LIMIT $2
    `;

    const fillResult = await db.query(fillQuery, [excludeIds, remaining]);
    result.rows.push(...fillResult.rows);
  }

  return result.rows;
}

module.exports = {
  VALID_SKILLS,
  computeEngagementScore,
  updateSkillMatrix,
  getTopInterestSkills,
  getRecommendationsByOverlap
};
