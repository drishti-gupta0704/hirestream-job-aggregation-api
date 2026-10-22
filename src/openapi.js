module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'HireStream API',
    version: '1.0.0',
    description: 'Job aggregation, search, saved jobs, application tracking and CSV ingestion API.'
  },
  servers: [{ url: '/', description: 'Current server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
  paths: {
    '/api/health': { get: { summary: 'Health check', responses: { '200': { description: 'API is running' } } } },
    '/api/health/ready': { get: { summary: 'Database readiness check', responses: { '200': { description: 'Database connected' }, '503': { description: 'Database unavailable' } } } },
    '/api/auth/register': { post: { summary: 'Register user', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name','email','password'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 } } } } } }, responses: { '201': { description: 'Created' }, '409': { description: 'Email already exists' } } } },
    '/api/auth/login': { post: { summary: 'Login and receive JWT', responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } } } },
    '/api/jobs': { get: { summary: 'Search and filter jobs', parameters: [
      { in: 'query', name: 'search', schema: { type: 'string' } },
      { in: 'query', name: 'location', schema: { type: 'string' } },
      { in: 'query', name: 'company', schema: { type: 'string' } },
      { in: 'query', name: 'employment_type', schema: { type: 'string' } },
      { in: 'query', name: 'workplace_type', schema: { type: 'string' } },
      { in: 'query', name: 'skill', schema: { type: 'string' } },
      { in: 'query', name: 'min_salary', schema: { type: 'number' } },
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } }
    ], responses: { '200': { description: 'Paginated job results' } } } },
    '/api/jobs/{id}': { get: { summary: 'Get job details', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'Job details' }, '404': { description: 'Not found' } } } },
    '/api/jobs/analytics/summary': { get: { summary: 'Job market analytics', responses: { '200': { description: 'Aggregated counts by location, company and skill' } } } },
    '/api/jobs/{id}/save': { post: { summary: 'Save a job', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Saved' }, '401': { description: 'Unauthorized' } } }, delete: { summary: 'Unsave a job', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Removed' } } } },
    '/api/saved-jobs': { get: { summary: 'List saved jobs', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Saved jobs' } } } },
    '/api/applications': { get: { summary: 'List tracked applications', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Applications' } } }, post: { summary: 'Track a job application', security: [{ bearerAuth: [] }], responses: { '201': { description: 'Tracked' } } } },
    '/api/applications/{id}': { patch: { summary: 'Update application status or notes', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Updated' } } }, delete: { summary: 'Delete tracked application', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Deleted' } } } },
    '/api/ingestion/csv': { post: { summary: 'Import jobs from CSV raw body', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'text/csv': { schema: { type: 'string' } } } }, responses: { '200': { description: 'Import summary' }, '401': { description: 'Unauthorized' } } } }
  }
};