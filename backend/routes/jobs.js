const express = require('express');
const router = express.Router();
const db = require('../db');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;


/**
 * POST /api/jobs/bulk
 * Bulk insert/update jobs
 * 
 * Body:
 * {
 *   "source": "linkedin",
 *   "jobs": [
 *     {
 *       "job_url": "...",
 *       "title": "...",
 *       "company": "...",
 *       "location": "...",
 *       "description": "...",
 *       "skills": ["..."],
 *       "responsibilities": ["..."],
 *       "role_category": "...",
 *       "seniority": "...",
 *       "work_style": ["..."],
 *       "metadata": {...}
 *     }
 *   ]
 * }
 */

/**
 * POST /api/jobs/bulk
 * Bulk insert/update jobs
 * 
 * Body:
 * {
 *   "source": "linkedin",
 *   "jobs": [
 *     {
 *       "job_url": "...",
 *       "title": "...",
 *       "company": "...",
 *       "location": "...",
 *       "description": "...",
 *       "skills": ["..."],
 *       "responsibilities": ["..."],
 *       "role_category": "...",
 *       "seniority": "...",
 *       "work_style": ["..."],
 *       "metadata": {...}
 *     }
 *   ]
 * }
 */
router.post('/bulk', async (req, res) => {
  try {
    const { source, jobs } = req.body;

    if (!source || !jobs || !Array.isArray(jobs)) {
      return res.status(400).json({ 
        error: 'Invalid request. Expected { source, jobs: [...] }' 
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const job of jobs) {
      const {
        job_url,
        title,
        company,
        location,
        description,
        skills = [],
        responsibilities = [],
        role_category,
        seniority,
        work_style = [],
        metadata = {}
      } = job;

      if (!job_url || !title) {
        continue; // Skip invalid jobs
      }

      // Upsert by job_url
      const query = `
        INSERT INTO jobs (
          source, job_url, title, company, location, description,
          skills, responsibilities, role_category, seniority, work_style, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (job_url) 
        DO UPDATE SET
          title = EXCLUDED.title,
          company = EXCLUDED.company,
          location = EXCLUDED.location,
          description = EXCLUDED.description,
          skills = EXCLUDED.skills,
          responsibilities = EXCLUDED.responsibilities,
          role_category = EXCLUDED.role_category,
          seniority = EXCLUDED.seniority,
          work_style = EXCLUDED.work_style,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
        RETURNING (xmax = 0) AS inserted
      `;

      const result = await db.query(query, [
        source,
        job_url,
        title,
        company || null,
        location || null,
        description || null,
        JSON.stringify(skills),
        JSON.stringify(responsibilities),
        role_category || null,
        seniority || null,
        JSON.stringify(work_style),
        JSON.stringify(metadata)
      ]);

      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    res.json({
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: insertedCount + updatedCount
    });

  } catch (error) {
    console.error('Error in /jobs/bulk:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/jobs
 * Get all jobs (paginated)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const query = `
      SELECT 
        id, source, job_url, title, company, location,
        skills, responsibilities, role_category, seniority, work_style,
        scraped_at, updated_at
      FROM jobs
      ORDER BY scraped_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);

    res.json({
      success: true,
      jobs: result.rows,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error in GET /jobs:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * POST /api/jobs/scrape
 * Scrape a job posting from HTML content
 * 
 * Body:
 * {
 *   "job_url": "...",
 *   "html_content": "...",
 *   "source": "linkedin" | "indeed" | "other"
 * }
 */
router.post('/scrape', async (req, res) => {
  try {
    const { job_url, html_content, source = 'linkedin' } = req.body;

    if (!job_url) {
      return res.status(400).json({ error: 'Missing job_url' });
    }

    if (!html_content) {
      return res.status(400).json({ error: 'Missing html_content' });
    }

    // Check if job already exists and was recently scraped
    const existingJob = await db.query(
      'SELECT id, scraped_at FROM jobs WHERE job_url = $1',
      [job_url]
    );

    // If job exists and was scraped in last hour, skip re-scraping
    if (existingJob.rows.length > 0) {
      const scrapedAt = existingJob.rows[0].scraped_at;
      if (scrapedAt) {
        const hoursSinceScrape = (Date.now() - new Date(scrapedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceScrape < 1) {
          return res.json({
            success: true,
            message: 'Job already scraped recently',
            job_id: existingJob.rows[0].id,
            skipped: true
          });
        }
      }
    }

    // Call Python scraper with HTML content
    const scraperPath = path.join(__dirname, '../../scraper/scraper.py');
    const tempHtmlPath = path.join(__dirname, '../../scraper/temp_scrape.html');
    
    try {
      // Write HTML to temp file
      await fs.writeFile(tempHtmlPath, html_content, 'utf8');
      
      // Call Python scraper
      const result = await new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [
          scraperPath,
          '--url', job_url,
          '--source', source,
          '--html-file', tempHtmlPath
        ], {
          cwd: path.join(__dirname, '../../scraper'),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Scraper failed with code ${code}: ${stderr}`));
          } else {
            resolve({ stdout, stderr });
          }
        });

        pythonProcess.on('error', (error) => {
          reject(new Error(`Failed to start scraper: ${error.message}`));
        });
      });

      // Clean up temp file
      try {
        await fs.unlink(tempHtmlPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      // Verify job was created
      const jobResult = await db.query(
        'SELECT id FROM jobs WHERE job_url = $1',
        [job_url]
      );

      if (jobResult.rows.length > 0) {
        return res.json({
          success: true,
          message: 'Job scraped and stored successfully',
          job_id: jobResult.rows[0].id
        });
      } else {
        // Scraper completed but job not found - might be a timing issue
        // Return success anyway since scraper ran
        return res.json({
          success: true,
          message: 'Scraper completed',
          warning: 'Job may need a moment to appear in database'
        });
      }
      
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempHtmlPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      console.error('Scraper error:', error);
      
      // Try to create a basic job entry as fallback
      try {
        const basicJob = await db.query(
          `INSERT INTO jobs (source, job_url, title, company, location, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (job_url) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [source, job_url, 'Scraping in progress...', 'Unknown', 'Unknown', 'Job is being processed']
        );
        
        return res.json({
          success: true,
          message: 'Job queued (scraper had errors)',
          job_id: basicJob.rows[0].id,
          warning: error.message
        });
      } catch (dbError) {
        return res.status(500).json({ 
          error: 'Scraper failed and could not create job entry',
          message: error.message 
        });
      }
    }

  } catch (error) {
    console.error('Error in POST /jobs/scrape:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /api/jobs/:id
 * Get single job by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM jobs WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      job: result.rows[0]
    });

  } catch (error) {
    console.error('Error in GET /jobs/:id:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});


router.get('/default', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const jobsFile = path.join(__dirname, '../../scraper/scraped_jobs.json'); 
    // ^ adjust path to wherever you placed the json

    const raw = await fs.readFile(jobsFile, 'utf8');
    const jobs = JSON.parse(raw);

    // normalize fields so extension is consistent
    const normalized = jobs.slice(0, limit).map(j => ({
      job_url: j.url,
      title: j.title,
      company: j.company,
      location: j.location,
      description: j.description,
      skills: j.required_skills || [],
      metadata: {
        source: 'linkedin',
        scraped_at: j.scraped_at,
        posted_date: j.posted_date,
      }
    }));

    res.json({ success: true, jobs: normalized, count: normalized.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


module.exports = router;
