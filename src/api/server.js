/**
 * ClearPath API Server
 *
 * REST API exposing the screening pipeline.
 * In production this would sit behind authentication middleware.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const { runPipeline } = require('../pipeline/orchestrator');
const { SubjectSchema } = require('../utils/schemas');
const logger = require('../utils/logger');

const app = express();

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests — please try again shortly.' },
});
app.use('/api/', limiter);

// ── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── SUBMIT A CHECK ──────────────────────────────────────────────────────────
/**
 * POST /api/checks
 *
 * Submit a subject for screening. Returns the full risk report.
 *
 * Body: SubjectSchema (see utils/schemas.js)
 *
 * Example:
 * {
 *   "fullName": "John Smith",
 *   "dateOfBirth": "1975-03-15",
 *   "nationality": "GB",
 *   "walletAddress": "0xabc...",
 *   "checkLayers": ["sanctions", "pep", "adverseMedia", "crypto"]
 * }
 */
app.post('/api/checks', async (req, res) => {
  // Validate input
  const parsed = SubjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid subject data',
      details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  const subject = parsed.data;
  const checkId = uuidv4();

  logger.info('Check submitted', { checkId, subject: subject.fullName });

  try {
    const report = await runPipeline(subject, checkId);
    return res.status(200).json(report);
  } catch (err) {
    logger.error('Pipeline error', { checkId, error: err.message, stack: err.stack });
    return res.status(500).json({
      error: 'Screening pipeline failed. Please try again.',
      checkId,
    });
  }
});

// ── GET CHECK RESULT ─────────────────────────────────────────────────────────
// In production this would fetch from the database.
// For MVP the pipeline is synchronous and returns the result immediately.
app.get('/api/checks/:checkId', (req, res) => {
  res.status(404).json({ error: 'Check not found. Use POST /api/checks to run a new check.' });
});

// ── DATA SOURCES STATUS ──────────────────────────────────────────────────────
app.get('/api/status/sources', (req, res) => {
  res.json({
    sources: [
      { id: 'opensanctions', name: 'OpenSanctions', status: process.env.OPEN_SANCTIONS_API_KEY ? 'configured' : 'public_mode', layer: 1 },
      { id: 'newsapi', name: 'NewsAPI', status: process.env.NEWS_API_KEY ? 'configured' : 'not_configured', layer: 3 },
      { id: 'companies_house', name: 'UK Companies House', status: process.env.COMPANIES_HOUSE_API_KEY ? 'configured' : 'not_configured', layer: 4 },
      { id: 'opencorporates', name: 'OpenCorporates', status: process.env.OPENCORPORATES_API_KEY ? 'configured' : 'public_mode', layer: 4 },
      { id: 'etherscan', name: 'Etherscan', status: process.env.ETHERSCAN_API_KEY ? 'configured' : 'public_mode', layer: 5 },
      { id: 'blockchair', name: 'Blockchair', status: process.env.BLOCKCHAIR_API_KEY ? 'configured' : 'public_mode', layer: 5 },
    ]
  });
});

// ── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`ClearPath API running on port ${PORT}`);
  logger.info('Endpoints: POST /api/checks · GET /api/status/sources · GET /health');
});

module.exports = app;
