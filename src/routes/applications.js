const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
const allowedStatuses = ['applied', 'in_review', 'interview', 'rejected', 'offer', 'withdrawn'];

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, j.title, j.company, j.location, j.apply_url
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.user_id = $1 ORDER BY a.applied_at DESC`,
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const jobId = Number(req.body.job_id);
    if (!Number.isInteger(jobId) || jobId < 1) return res.status(400).json({ error: 'job_id must be a positive integer.' });
    const result = await pool.query(
      `INSERT INTO applications (user_id, job_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, job_id) DO NOTHING
       RETURNING *`,
      [req.user.id, jobId, typeof req.body.notes === 'string' ? req.body.notes.slice(0, 2000) : '']
    );
    if (result.rowCount) return res.status(201).json({ message: 'Application tracked.', data: result.rows[0] });
    const exists = await pool.query('SELECT id FROM applications WHERE user_id = $1 AND job_id = $2', [req.user.id, jobId]);
    if (exists.rowCount) return res.status(409).json({ error: 'You are already tracking an application for this job.' });
    res.status(404).json({ error: 'Job not found.' });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(', ')}.` });
    }
    if (notes !== undefined && typeof notes !== 'string') return res.status(400).json({ error: 'notes must be a string.' });
    const result = await pool.query(
      `UPDATE applications SET
         status = COALESCE($1, status),
         notes = COALESCE($2, notes),
         updated_at = NOW()
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [status || null, notes === undefined ? null : notes.slice(0, 2000), req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Application not found.' });
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM applications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Application not found.' });
    res.json({ message: 'Application tracking entry deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;