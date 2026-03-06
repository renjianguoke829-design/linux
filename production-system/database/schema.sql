CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contradiction_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    facts TEXT,
    subjects TEXT,
    contradiction TEXT,
    state_apparatus TEXT,
    observable_signals TEXT,
    trajectory TEXT,
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pipeline_id UUID
);

CREATE TABLE IF NOT EXISTS decision_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    input TEXT,
    options TEXT,
    judgment TEXT,
    execution_result TEXT,
    retrospective TEXT,
    principles TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name TEXT NOT NULL,
    stage TEXT NOT NULL,
    ai_model TEXT,
    project_name TEXT,
    input TEXT,
    output TEXT,
    duration_ms INTEGER,
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    content TEXT,
    data_tier INTEGER CHECK (data_tier IN (1, 2, 3)),
    source_url TEXT,
    language TEXT,
    collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_refined BOOLEAN NOT NULL DEFAULT FALSE,
    refined_at TIMESTAMP,
    auto_destroy_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_data_id UUID REFERENCES raw_data(id) ON DELETE SET NULL,
    content TEXT,
    label TEXT,
    framework TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt TEXT,
    output TEXT,
    duration_ms INTEGER,
    token_count INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settings JSONB
);

CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS org_productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    pipeline_id UUID,
    output_type TEXT,
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personal_productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    output_type TEXT,
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
