CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT 'Not specified',
  description TEXT NOT NULL DEFAULT '',
  employment_type VARCHAR(50) NOT NULL DEFAULT 'Full-time',
  workplace_type VARCHAR(50) NOT NULL DEFAULT 'On-site',
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  apply_url TEXT,
  source VARCHAR(100) NOT NULL DEFAULT 'manual',
  skills TEXT[] NOT NULL DEFAULT '{}',
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT jobs_external_source_unique UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS jobs_title_idx ON jobs USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS jobs_company_idx ON jobs (company);
CREATE INDEX IF NOT EXISTS jobs_location_idx ON jobs (location);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs (created_at DESC);

CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied','in_review','interview','rejected','offer','withdrawn')),
  notes TEXT NOT NULL DEFAULT '',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS applications_user_idx ON applications (user_id, applied_at DESC);