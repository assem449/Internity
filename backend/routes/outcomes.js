const express = require('express');
const router = express.Router();
const db = require('../db');
const { validate: isValidUUID } = require('uuid');

/**
 * POST /api/outcomes
 * Record user outcome for a job
 * 
 * Body:
 * {
 *   "anonymous_id": "UUID",
 *   "job_url": "...",
 *   "outcome": "applied" | "currently_applying" | "not_applied",
 *   "metadata": {
 *     "dwell_time_ms": 45000,
 *     "scroll_depth": 0.8,
 *     "revisit_count": 2,
 *     "source": "linkedin"
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { anonymous_id, job_url, outcome, metadata = {} } = req.body;

    // Validate input
    if (!anonymous_id || !isValidUUID(anonymous_id)) {
      return res.status(400).json({ error: 'Invalid or missing anonymous_id (must be UUID)' });
    }

    if (!job_url) {
      return res.status(400).json({ error: 'Missing job_url' });
    }

    if (!['applied', 'currently_applying', 'not_applied'].includes(outcome)) {
      return res.status(400).json({ 
        error: 'Invalid outcome. Must be: applied, currently_applying, or not_applied' 
      });
    }

    // Find or create job
    let jobResult = await db.query('SELECT id FROM jobs WHERE job_url = $1', [job_url]);
    
    let jobId;
    if (jobResult.rows.length === 0) {
      // Job doesn't exist - create a minimal placeholder
      // This should trigger the scraper in production
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
      
      jobId = newJobResult.rows[0].id;
    } else {
      jobId = jobResult.rows[0].id;
    }

    // Upsert outcome
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
      jobId,
      outcome,
      JSON.stringify(metadata)
    ]);

    res.json({
      success: true,
      outcome_id: outcomeResult.rows[0].id,
      job_id: jobId,
      message: 'Outcome recorded successfully'
    });

  } catch (error) {
    console.error('Error in POST /outcomes:', error);
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
