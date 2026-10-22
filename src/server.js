require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is required and must be at least 32 characters. Set it in .env or your hosting environment.');
  process.exit(1);
}

const app = require('./app');
const pool = require('./config/db');
const port = Number(process.env.PORT) || 4000;

const server = app.listen(port, () => {
  console.log(`HireStream API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));