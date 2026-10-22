const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT j.*, s.created_at AS saved_at
       FROM saved_jobs s JOIN jobs j ON j.id = s.job_id
       WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;