const express = require('express');
const router = express.Router();
const db = require('../db');
const { validate: isValidUUID } = require('uuid');
const {
  computeEngagementScore,
  updateSkillMatrix,
  getTopInterestSkills,
  getRecommendationsByOverlap
} = require('../helpers/learningLoop');

/**
 * POST /api/outcomes - LEARNING LOOP IMPLEMENTATION
 * Record user outcome for a job AND update user skill matrix
 *
 * Body (new format):
 * {
 *   "anonymous_id": "UUID",
 *   "job_id": 123,
 *   "outcome": "applied" | "currently_applying" | "not_applied",
 *   "dwell_time_ms": 42000,
 *   "scroll_depth": 0.78,
 *   "revisit_count": 2
 * }
 *
 * OR (legacy format for backward compatibility):
 * {
 *   "anonymous_id": "UUID",
 *   "job_url": "...",
 *   "outcome": "applied" | "currently_applying" | "not_applied",
 *   "metadata": { "dwell_time_ms": 42000, "scroll_depth": 0.78, ... }
 * }
 *
 * Returns:
 * {
 *   "ok": true,
 *   "scores": { "E": 0.6, "O": 1, "I": 0.88 },
 *   "top_skills": ["react", "typescript", "docker", ...],
 *   "recommendations": [{ "id": 1, "job_url": "...", "title": "...", "company": "...", "overlap": 4 }]
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      anonymous_id,
      job_id,
      job_url,
      outcome,
      dwell_time_ms,
      scroll_depth,
      revisit_count,
      metadata = {}
    } = req.body;

    // ===== STEP 1: Validate input =====
    if (!anonymous_id || !isValidUUID(anonymous_id)) {
      return res.status(400).json({ error: 'Invalid or missing anonymous_id (must be UUID)' });
    }

    if (!job_id && !job_url) {
      return res.status(400).json({ error: 'Missing job_id or job_url' });
    }

    if (!['applied', 'currently_applying', 'not_applied'].includes(outcome)) {
      return res.status(400).json({
        error: 'Invalid outcome. Must be: applied, currently_applying, or not_applied'
      });
    }

    // ===== STEP 2: Get job_id (from param or by job_url lookup) =====
    let finalJobId = job_id;

    if (!finalJobId && job_url) {
      // Legacy format: find job by URL
      let jobResult = await db.query('SELECT id FROM jobs WHERE job_url = $1', [job_url]);

      if (jobResult.rows.length === 0) {
        // Create placeholder job
        const insertJobQuery = `
          INSERT INTO jobs (source, job_url, title, company, location, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;

        const newJobResult = await db.query(insertJobQuery, [
          metadata.source || 'unknown',
          job_url,
          'Pending Scrape',
          'Unknown',
          'Unknown',
          'This job is pending full scrape and enrichment'
        ]);

        finalJobId = newJobResult.rows[0].id;
      } else {
        finalJobId = jobResult.rows[0].id;
      }
    }

    // ===== STEP 3: Upsert job_outcomes =====
    // Extract behavior fields (support both formats)
    const behaviorData = {
      dwell_time_ms: dwell_time_ms !== undefined ? dwell_time_ms : metadata.dwell_time_ms,
      scroll_depth: scroll_depth !== undefined ? scroll_depth : metadata.scroll_depth,
      revisit_count: revisit_count !== undefined ? revisit_count : metadata.revisit_count,
      ...metadata // Include any other metadata
    };

    const outcomeQuery = `
      INSERT INTO job_outcomes (anonymous_id, job_id, outcome, metadata)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (anonymous_id, job_id)
      DO UPDATE SET
        outcome = EXCLUDED.outcome,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, created_at, updated_at
    `;

    const outcomeResult = await db.query(outcomeQuery, [
      anonymous_id,
      finalJobId,
      outcome,
      JSON.stringify(behaviorData)
    ]);

    // ===== STEP 4: Compute E, O, I scores =====
    // Engagement (E): Computed from behavior metrics
    const E = computeEngagementScore({
      dwell_time_ms: behaviorData.dwell_time_ms,
      scroll_depth: behaviorData.scroll_depth,
      revisit_count: behaviorData.revisit_count
    });

    // Outcome (O): Binary score for positive outcomes
    const O = (outcome === 'applied' || outcome === 'currently_applying') ? 1 : 0;

    // Interest (I): Weighted combination of O and E
    const I = (0.7 * O) + (0.3 * E);

    const scores = { E, O, I };

    console.log(`[Learning Loop] Scores for user ${anonymous_id}, job ${finalJobId}:`, scores);

    // ===== STEP 5: Ensure user_skill_matrix rows exist =====
    await db.query('SELECT ensure_user_skill_matrix_rows($1::uuid)', [anonymous_id]);

    // ===== STEP 6: Fetch job skills and update skill matrix =====
    const jobQuery = 'SELECT skills FROM jobs WHERE id = $1';
    const jobResult = await db.query(jobQuery, [finalJobId]);

    let jobSkills = [];
    if (jobResult.rows.length > 0 && jobResult.rows[0].skills) {
      jobSkills = Array.isArray(jobResult.rows[0].skills)
        ? jobResult.rows[0].skills
        : jobResult.rows[0].skills;
    }

    console.log(`[Learning Loop] Job skills:`, jobSkills);

    // Update skill matrix with E, O, I scores for matching skills
    if (jobSkills.length > 0) {
      await updateSkillMatrix(anonymous_id, jobSkills, scores);
    }

    // ===== STEP 7: Get top 8 interest skills =====
    const topSkills = await getTopInterestSkills(anonymous_id, 8);

    console.log(`[Learning Loop] Top interest skills:`, topSkills);

    // ===== STEP 8: Get job recommendations based on skill overlap =====
    const recommendations = await getRecommendationsByOverlap(topSkills, 10, finalJobId);

    // Format recommendations for response
    const formattedRecommendations = recommendations.map(job => ({
      id: job.id,
      job_url: job.job_url,
      title: job.title,
      company: job.company,
      overlap: parseInt(job.overlap || 0)
    }));

    // ===== STEP 9: Return response =====
    res.json({
      ok: true,
      outcome_id: outcomeResult.rows[0].id,
      job_id: finalJobId,
      scores: {
        E: parseFloat(E.toFixed(2)),
        O: O,
        I: parseFloat(I.toFixed(2))
      },
      top_skills: topSkills,
      recommendations: formattedRecommendations
    });

  } catch (error) {
    console.error('Error in POST /outcomes (learning loop):', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/outcomes
 * Get outcomes for a user
 */
router.get('/', async (req, res) => {
  try {
    const { anonymous_id, limit = 50 } = req.query;

    if (!anonymous_id || !isValidUUID(anonymous_id)) {
      return res.status(400).json({ error: 'Invalid or missing anonymous_id parameter' });
    }

    const query = `
      SELECT 
        o.id,
        o.outcome,
        o.metadata,
        o.created_at,
        o.updated_at,
        j.id as job_id,
        j.title,
        j.company,
        j.location,
        j.job_url,
        j.skills
      FROM job_outcomes o
      JOIN jobs j ON o.job_id = j.id
      WHERE o.anonymous_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [anonymous_id, parseInt(limit)]);

    res.json({
      success: true,
      outcomes: result.rows
    });

  } catch (error) {
    console.error('Error in GET /outcomes:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
