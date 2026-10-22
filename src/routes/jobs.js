const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requiredString, optionalNumber, parseSkills } = require('../utils/validation');

const router = express.Router();

function makeFilters(query) {
  const clauses = [];
  const values = [];
  const add = (sql, value) => { values.push(value); clauses.push(sql.replace('?', `$${values.length}`)); };

  if (query.search) add("(j.title ILIKE '%' || ? || '%' OR j.company ILIKE '%' || ? || '%' OR j.description ILIKE '%' || ? || '%')", query.search);
  // Use separate parameters for each placeholder in the search condition.
  if (query.search) {
    const base = values.length;
    clauses[clauses.length - 1] = `(j.title ILIKE '%' || $${base} || '%' OR j.company ILIKE '%' || $${base} || '%' OR j.description ILIKE '%' || $${base} || '%')`;
  }
  if (query.location) add("j.location ILIKE '%' || ? || '%'", query.location);
  if (query.company) add("j.company ILIKE '%' || ? || '%'", query.company);
  if (query.employment_type) add('j.employment_type = ?', query.employment_type);
  if (query.workplace_type) add('j.workplace_type = ?', query.workplace_type);
  if (query.skill) add('? = ANY(j.skills)', query.skill);
  if (query.min_salary !== undefined && query.min_salary !== '') add('COALESCE(j.salary_max, j.salary_min, 0) >= ?', Number(query.min_salary));
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const filters = makeFilters(req.query);

    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM jobs j ${filters.where}`, filters.values);
    const result = await pool.query(
      `SELECT j.* FROM jobs j ${filters.where} ORDER BY COALESCE(j.posted_at, j.created_at) DESC LIMIT $${filters.values.length + 1} OFFSET $${filters.values.length + 2}`,
      [...filters.values, limit, offset]
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) }
    });
  } catch (err) { next(err); }
});

router.get('/analytics/summary', async (req, res, next) => {
  try {
    const [total, locations, companies, skills] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total_jobs FROM jobs'),
      pool.query('SELECT location, COUNT(*)::int AS jobs FROM jobs GROUP BY location ORDER BY jobs DESC LIMIT 10'),
      pool.query('SELECT company, COUNT(*)::int AS jobs FROM jobs GROUP BY company ORDER BY jobs DESC LIMIT 10'),
      pool.query("SELECT skill, COUNT(*)::int AS jobs FROM jobs j CROSS JOIN LATERAL unnest(j.skills) AS skill GROUP BY skill ORDER BY jobs DESC LIMIT 15")
    ]);
    res.json({
      totalJobs: total.rows[0].total_jobs,
      topLocations: locations.rows,
      topCompanies: companies.rows,
      topSkills: skills.rows
    });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Job id must be a number.' });
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Job not found.' });
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

// Admin functionality is intentionally not exposed in this starter.
// Use CSV ingestion or your own protected admin route to create jobs.

router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id, job_id, created_at',
      [req.user.id, req.params.id]
    );
    if (result.rowCount) return res.status(201).json({ message: 'Job saved.', data: result.rows[0] });
    const exists = await pool.query('SELECT 1 FROM jobs WHERE id = $1', [req.params.id]);
    if (!exists.rowCount) return res.status(404).json({ error: 'Job not found.' });
    res.json({ message: 'Job was already saved.' });
  } catch (err) { next(err); }
});

router.delete('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [req.user.id, req.params.id]);
    res.json({ message: result.rowCount ? 'Saved job removed.' : 'Job was not saved.' });
  } catch (err) { next(err); }
});

module.exports = router;