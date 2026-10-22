const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  res.json({ status: 'ok', service: 'HireStream API', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

module.exports = router;