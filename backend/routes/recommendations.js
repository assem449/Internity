const express = require('express');
const router = express.Router();
const { validate: isValidUUID } = require('uuid');

/**
 * GET /api/recommendations
 * Get personalized recommendations (proxies to Python recommender)
 */
router.get('/', async (req, res) => {
  try {
    const { anonymous_id, limit = 20 } = req.query;

    if (!anonymous_id || !isValidUUID(anonymous_id)) {
      return res.status(400).json({ error: 'Invalid or missing anonymous_id parameter' });
    }

    // Proxy to Python recommender service
    const recommenderUrl = process.env.RECOMMENDER_URL || 'http://recommender:8000';
    
    const response = await fetch(`${recommenderUrl}/api/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        anonymous_id,
        limit: parseInt(limit)
      })
    });

    if (!response.ok) {
      throw new Error(`Recommender service error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Error in GET /recommendations:', error);
    
    // Fallback if recommender is down
    res.status(503).json({ 
      error: 'Recommender service unavailable',
      message: error.message,
      recommendations: []
    });
  }
});

module.exports = router;
