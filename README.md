# HireStream — Job Aggregation & Search Backend

A deployable Node.js + Express + PostgreSQL MVP with job search, filters, pagination, JWT authentication, saved jobs, application tracking, CSV ingestion, analytics, and Swagger documentation.

> The starter version does **not** yet include Apache Kafka, Apache Spark, MongoDB, a live external job feed, or a frontend. Do not claim those integrations on your resume until you implement and test them. Demo seed data is fictional.

## Requirements

- Node.js 20+
- npm
- A PostgreSQL database (local or hosted, e.g. Neon)
- Git and a GitHub account for deployment

## 1. Install

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL`: PostgreSQL connection string from your database provider
- `JWT_SECRET`: long random secret (at least 32 characters)
- `CORS_ORIGIN`: `*` is convenient for initial API testing; for production, set the exact frontend origin(s), comma-separated
- `PORT`: locally defaults to 4000

Generate a secret with one of:
```bash
openssl rand -base64 48
```
Never commit `.env` to GitHub.

## 2. Create database tables

```bash
npm run db:init
npm run db:seed
```

`db:seed` adds clearly fictional sample jobs so the API has data to test. Remove them from production if you don't want demo records.

## 3. Run locally

```bash
npm run dev
```

Open:
- API root: http://localhost:4000/
- Swagger docs: http://localhost:4000/api-docs
- Health: http://localhost:4000/api/health
- Jobs: http://localhost:4000/api/jobs
- Analytics: http://localhost:4000/api/jobs/analytics/summary

## API endpoints

| Method | Endpoint | Auth? | Purpose |
|---|---|---:|---|
| GET | `/api/health` | No | Health check |
| GET | `/api/health/ready` | No | Database readiness |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT |
| GET | `/api/jobs` | No | Search/filter/paginate jobs |
| GET | `/api/jobs/:id` | No | Job details |
| GET | `/api/jobs/analytics/summary` | No | Job market aggregates |
| POST | `/api/jobs/:id/save` | Yes | Save a job |
| DELETE | `/api/jobs/:id/save` | Yes | Unsave a job |
| GET | `/api/saved-jobs` | Yes | List saved jobs |
| GET | `/api/applications` | Yes | List tracked applications |
| POST | `/api/applications` | Yes | Track an application |
| PATCH | `/api/applications/:id` | Yes | Change status/notes |
| DELETE | `/api/applications/:id` | Yes | Delete tracked application |
| POST | `/api/ingestion/csv` | Yes | Import CSV records |

### Search examples

```text
GET /api/jobs?search=backend
GET /api/jobs?location=Noida&employment_type=Full-time
GET /api/jobs?skill=Node.js&page=1&limit=10
GET /api/jobs?min_salary=600000
```

Allowed application statuses: `applied`, `in_review`, `interview`, `rejected`, `offer`, `withdrawn`.

## 4. Test authentication

Register:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","password":"StrongPass123"}'
```

Login:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"StrongPass123"}'
```

Copy `token` from the response. Use it for protected endpoints:
```bash
curl http://localhost:4000/api/saved-jobs \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Track an application:
```bash
curl -X POST http://localhost:4000/api/applications \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"job_id":1,"notes":"Applied through company careers page"}'
```

## 5. Import a CSV

First log in and copy your JWT. Send raw CSV content (not multipart form data) to the endpoint:

```bash
curl -X POST http://localhost:4000/api/ingestion/csv \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: text/csv' \
  --data-binary @sample-jobs.csv
```

Required headers: `title`, `company`. Optional headers include `external_id`, `location`, `description`, `employment_type`, `workplace_type`, `salary_min`, `salary_max`, `currency`, `apply_url`, `source`, `skills`, `posted_at`.

- `skills` can be separated with semicolons or commas.
- Duplicate prevention uses the unique pair `(source, external_id)` when `external_id` is provided.
- Invalid rows are skipped and counted. This endpoint is limited to `MAX_CSV_ROWS` and a 2 MB request body.
- This MVP processes CSV synchronously; it is not yet a Kafka/Spark pipeline.

## 6. Deploy on Render

1. Push this project to a GitHub repository.
2. Create a PostgreSQL database on Neon or another provider. Copy its connection string.
3. In Render, create **New → Web Service**, connect the repository, and set:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variables in Render:
   - `NODE_ENV=production`
   - `DATABASE_URL=<your hosted PostgreSQL connection string>`
   - `JWT_SECRET=<a newly generated long random secret>`
   - `JWT_EXPIRES_IN=7d`
   - `CORS_ORIGIN=*` for API-only testing; replace with your frontend origin when you add one
   - `MAX_CSV_ROWS=5000`
5. After the first deploy, initialize the hosted database from your local terminal by temporarily setting `DATABASE_URL` to the hosted database connection string and running:
   ```bash
   npm run db:init
   npm run db:seed
   ```
   Do not paste the database URL into source code or commit it.
6. Open `https://YOUR-SERVICE.onrender.com/api/health/ready`, then `/api-docs`.

Free hosted services may sleep when inactive and providers may change free-tier limits. Keep secrets private. For production use, tighten CORS, add admin roles to ingestion, consider migrations/backups, and review security settings.

## Architecture notes

- PostgreSQL is the primary source of truth in this MVP.
- Passwords are hashed with bcrypt.
- JWT-protected routes use the `Authorization: Bearer <token>` header.
- SQL queries are parameterized.
- `source` + `external_id` provides idempotency for records with a stable external ID.
- Analytics endpoints use SQL aggregation over ingested data.

## Before listing on your resume

Only include tools that you actually implemented and can explain. A truthful initial description is:

**HireStream — Job Aggregation & Search Backend | Node.js, Express.js, PostgreSQL**
- Built REST APIs for job search, filtering, pagination, saved jobs and application tracking.
- Implemented JWT authentication, parameterized PostgreSQL queries, CSV ingestion and duplicate detection.
- Added Swagger API documentation and SQL-based job-market analytics; deployed the API to Render.

Add Redis, Kafka, Spark, MongoDB, or external API integrations to the resume after you have built and tested those components.
