const express = require('express');
const csv = require('csv-parser');
const { Readable } = require('stream');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requiredString, optionalNumber, parseSkills } = require('../utils/validation');

const router = express.Router();

// Starter-project ingestion endpoint: accepts CSV text in JSON.
// Protect it with JWT. Do not expose ingestion publicly without authentication.
router.post('/csv', requireAuth, express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }), async (req, res, next) => {
  try {
    if (typeof req.body !== 'string' || !req.body.trim()) {
      return res.status(400).json({ error: 'Send the CSV as the raw request body with Content-Type: text/csv.' });
    }

    const rows = [];
    const maxRows = Math.min(20000, Math.max(1, Number(process.env.MAX_CSV_ROWS) || 5000));
    await new Promise((resolve, reject) => {
      Readable.from([req.body])
        .pipe(csv())
        .on('data', row => {
          if (rows.length < maxRows) rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });
    if (!rows.length) return res.status(400).json({ error: 'CSV has no data rows or headers are missing.' });

    const client = await pool.connect();
    let inserted = 0, skipped = 0, failed = 0;
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        try {
          const title = requiredString(row.title, 'title');
          const company = requiredString(row.company, 'company');
          const location = (row.location || 'Not specified').trim().slice(0, 255);
          const source = (row.source || 'csv-import').trim().slice(0, 100) || 'csv-import';
          const externalId = (row.external_id || '').trim().slice(0, 255) || null;
          const salaryMin = optionalNumber(row.salary_min, 'salary_min');
          const salaryMax = optionalNumber(row.salary_max, 'salary_max');
          const skills = parseSkills(row.skills);
          const result = await client.query(
            `INSERT INTO jobs
             (external_id, title, company, location, description, employment_type, workplace_type,
              salary_min, salary_max, currency, apply_url, source, skills, posted_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             ON CONFLICT (source, external_id) DO NOTHING RETURNING id`,
            [externalId, title, company, location, (row.description || '').slice(0, 20000),
             (row.employment_type || 'Full-time').slice(0, 50), (row.workplace_type || 'On-site').slice(0, 50),
             salaryMin, salaryMax, (row.currency || 'INR').slice(0, 10), row.apply_url || null,
             source, skills, row.posted_at ? new Date(row.posted_at) : null]
          );
          if (result.rowCount) inserted++; else skipped++;
        } catch {
          failed++;
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    res.json({ message: 'CSV ingestion finished.', processed: rows.length, inserted, skippedDuplicates: skipped, failedRows: failed, rowLimit: maxRows });
  } catch (err) { next(err); }
});

module.exports = router;