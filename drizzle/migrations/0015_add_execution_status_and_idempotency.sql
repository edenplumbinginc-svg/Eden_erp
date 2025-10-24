-- Migration 0015: Add execution status tracking and idempotency to decision_executions
-- Fixes audit trail to only log after successful actions
-- Adds deterministic action_hash for idempotent deduplication
-- Created: 2025-10-24

-- Add success/failure tracking
ALTER TABLE decision_executions
  ADD COLUMN IF NOT EXISTS success boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS error_text text;

-- Add deterministic idempotency key (sha256 of policy+effect+target+payload)
ALTER TABLE decision_executions
  ADD COLUMN IF NOT EXISTS action_hash text;

-- Prevent duplicate actions within the same scope
-- This makes execution truly idempotent across restarts
CREATE UNIQUE INDEX IF NOT EXISTS decision_executions_action_hash_unique
  ON decision_executions(action_hash)
  WHERE action_hash IS NOT NULL;

-- Speed up lookups by policy and time
CREATE INDEX IF NOT EXISTS decision_executions_success_idx
  ON decision_executions(success, created_at DESC)
  WHERE success = true;
