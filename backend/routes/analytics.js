const express = require('express');
const router = express.Router();
const db = require('../db');
const { validate: isValidUUID } = require('uuid');

/**
 * GET /api/analytics/funnel
 * Get application funnel stats for a user
 */
router.get('/funnel', async (req, res) => {
  try {
    const { anonymous_id } = req.query;

    if (!anonymous_id || !isValidUUID(anonymous_id)) {
      return res.status(400).json({ error: 'Invalid or missing anonymous_id parameter' });
    }

    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE outcome = 'applied') as applied_count,
        COUNT(*) FILTER (WHERE outcome = 'currently_applying') as currently_applying_count,
        COUNT(*) FILTER (WHERE outcome = 'not_applied') as not_applied_count,
        COUNT(*) as total_outcomes
      FROM job_outcomes
      WHERE anonymous_id = $1
    `;

    const result = await db.query(query, [anonymous_id]);
    const stats = result.rows[0];

    // Calculate percentages
    const total = parseInt(stats.total_outcomes);
    const funnel = {
      applied: {
        count: parseInt(stats.applied_count),
        percentage: total > 0 ? (parseInt(stats.applied_count) / total * 100).toFixed(1) : 0
      },
      currently_applying: {
        count: parseInt(stats.currently_applying_count),
        percentage: total > 0 ? (parseInt(stats.currently_applying_count) / total * 100).toFixed(1) : 0
      },
      not_applied: {
        count: parseInt(stats.not_applied_count),
        percentage: total > 0 ? (parseInt(stats.not_applied_count) / total * 100).toFixed(1) : 0
      },
      total: total
    };

    res.json({
      success: true,
      funnel
    });

  } catch (error) {
    console.error('Error in GET /analytics/funnel:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/analytics/skills
 * Get top skills from jobs user applied to
 */
router.get('/skills', async (req, res) => {
  try {
    const { anonymous_id } = req.query;

    if (!anonymous_id || !isValidUUID(anonymous_id)) {
      return res.status(400).json({ error: 'Invalid or missing anonymous_id parameter' });
    }

    const query = `
      SELECT 
        j.skills
      FROM job_outcomes o
      JOIN jobs j ON o.job_id = j.id
      WHERE o.anonymous_id = $1 
        AND o.outcome IN ('applied', 'currently_applying')
        AND j.skills IS NOT NULL
        AND j.skills != '[]'::jsonb
    `;

    const result = await db.query(query, [anonymous_id]);

    // Aggregate skills
    const skillCounts = {};
    result.rows.forEach(row => {
      const skills = row.skills;
      skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    // Sort by frequency
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }));

    res.json({
      success: true,
      skills: topSkills
    });

  } catch (error) {
    console.error('Error in GET /analytics/skills:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/analytics/timeline
 * Get application activity over time
 */
router.get('/timeline', async (req, res) => {
  try {
    const { anonymous_id, days = 30 } = req.query;

    if (!anonymous_id || !isValidUUID(anonymous_id)) {
      return res.status(400).json({ error: 'Invalid or missing anonymous_id parameter' });
    }

    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE outcome = 'applied') as applied,
        COUNT(*) FILTER (WHERE outcome = 'currently_applying') as currently_applying,
        COUNT(*) FILTER (WHERE outcome = 'not_applied') as not_applied
      FROM job_outcomes
      WHERE anonymous_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await db.query(query, [anonymous_id]);

    res.json({
      success: true,
      timeline: result.rows
    });

  } catch (error) {
    console.error('Error in GET /analytics/timeline:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
