-- Resurox Job Application Copilot — Supabase Schema (v1.1.0)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  pairing_token_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  version INT DEFAULT 1,
  candidate_name TEXT NOT NULL,
  target_role TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  structured_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_records (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  canonical_skill TEXT,
  source_span TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'RESUME_EVIDENCE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_jd TEXT NOT NULL,
  raw_jd_hash TEXT NOT NULL,
  requirements JSONB NOT NULL,
  extraction_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  score INT NOT NULL,
  status TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confirmations (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL,
  requirement_text TEXT,
  answer TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tailored_resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_runs (
  id TEXT PRIMARY KEY,
  analysis_id TEXT,
  step TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  latency_ms INT NOT NULL,
  outcome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
