require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
const jobsRoutes = require('./routes/jobs');
const outcomesRoutes = require('./routes/outcomes');
const analyticsRoutes = require('./routes/analytics');
const recommendationsRoutes = require('./routes/recommendations');

app.use('/api/jobs', jobsRoutes);
app.use('/api/outcomes', outcomesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      service: 'internity-backend',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      service: 'internity-backend',
      error: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Internity Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      jobs: {
        bulk: 'POST /api/jobs/bulk',
        list: 'GET /api/jobs',
        get: 'GET /api/jobs/:id'
      },
      outcomes: {
        create: 'POST /api/outcomes',
        list: 'GET /api/outcomes?anonymous_id=...'
      },
      analytics: {
        funnel: 'GET /api/analytics/funnel?anonymous_id=...',
        skills: 'GET /api/analytics/skills?anonymous_id=...',
        timeline: 'GET /api/analytics/timeline?anonymous_id=...'
      },
      recommendations: {
        get: 'GET /api/recommendations?anonymous_id=...&limit=20'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Internity Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'configured' : 'using default'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  db.pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
