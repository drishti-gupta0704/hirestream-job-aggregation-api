const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { requiredString } = require('../utils/validation');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const name = requiredString(req.body.name, 'name', 100);
    const email = requiredString(req.body.email, 'email', 255).toLowerCase();
    const password = req.body.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, passwordHash]
    );
    res.status(201).json({ message: 'Account created.', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = requiredString(req.body.email, 'email', 255).toLowerCase();
    const password = req.body.password;
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'password is required.' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      message: 'Login successful.',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;