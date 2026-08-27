-- Gate 4 Forge — AI generation job records.
-- See docs/gate-1/03-data-model.md batch 11, ADR-006, Section 38's
-- "long AI tasks should use job IDs or streaming with resumable status."
-- `requester_user_id` is nullable: QB-001 lets a guest generate one
-- limited private AI quest without an account.

CREATE TABLE generation_jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type            VARCHAR(30) NOT NULL CHECK (job_type IN (
    'quest_forge', 'conversational_turn', 'nearby_variant', 'inventory_extraction', 'translation'
  )),
  requester_user_id   UUID REFERENCES users(id),
  status              VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'succeeded', 'failed', 'timed_out'
  )),
  input               JSONB NOT NULL,
  output              JSONB,
  error_message       TEXT,
  prompt_version      VARCHAR(30) NOT NULL DEFAULT 'v1-stub',
  model_identifier    VARCHAR(100) NOT NULL DEFAULT 'stub-no-provider-configured',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_generation_jobs_requester ON generation_jobs(requester_user_id);
