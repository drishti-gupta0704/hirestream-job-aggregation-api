const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const savedJobsRoutes = require('./routes/savedJobs');
const applicationRoutes = require('./routes/applications');
const ingestionRoutes = require('./routes/ingestion');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(v => v.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/', (req, res) => res.json({
  name: 'HireStream API',
  status: 'running',
  docs: '/api-docs',
  health: '/api/health',
  jobs: '/api/jobs'
}));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/saved-jobs', savedJobsRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;