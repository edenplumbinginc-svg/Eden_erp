-- Migration 0013: Add decision_policies and decision_executions tables
-- Auto-Decisions v0 Safe Rules Engine
-- Created: 2025-10-24

create table if not exists decision_policies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  enabled boolean not null default false,
  dry_run boolean not null default true,
  description text,
  condition jsonb not null,
  action jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists decision_executions (
  id uuid primary key default gen_random_uuid(),
  policy_slug text not null,
  matched boolean not null,
  dry_run boolean not null,
  effect text not null,
  target_type text,
  target_id text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists decision_executions_policy_time_idx
  on decision_executions (policy_slug, created_at desc);

create index if not exists decision_executions_created_idx
  on decision_executions (created_at desc);
