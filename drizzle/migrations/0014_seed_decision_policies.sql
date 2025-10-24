-- Migration 0014: Seed initial decision policies
-- Three safe, pragmatic policies for Auto-Decisions v0
-- Created: 2025-10-24

-- 1) Auto-handoff: Estimation → Procurement when Estimation checklist hits 100%
insert into decision_policies (slug, enabled, dry_run, description, condition, action)
values
(
  'handoff.estimation_to_procurement',
  true,
  true,
  'When an Estimation task completes, create a Procurement RFQ task.',
  jsonb_build_object(
    'type', 'task_checklist_complete',
    'department', 'Estimating'
  ),
  jsonb_build_object(
    'effect', 'create_task',
    'template', jsonb_build_object(
      'title_prefix', '[AUTO] Procurement RFQ for ',
      'department', 'Procurement',
      'label', 'auto:handoff',
      'inherit_project', true
    )
  )
)
on conflict (slug) do nothing;

-- 2) Escalate overdue: if task idle > 7 days, notify ops lead
insert into decision_policies (slug, enabled, dry_run, description, condition, action)
values
(
  'escalate.idle_task_7d',
  true,
  true,
  'If a task is idle > 7 days and not done, notify Operations.',
  jsonb_build_object(
    'type', 'task_idle',
    'days', 7
  ),
  jsonb_build_object(
    'effect', 'notify',
    'channel', 'inapp',
    'role', 'ops'
  )
)
on conflict (slug) do nothing;

-- 3) Speed badge probe: if checklist item finished under 1h, add label
insert into decision_policies (slug, enabled, dry_run, description, condition, action)
values
(
  'badge.lightning_fast_1h',
  true,
  true,
  'Award "Lightning Fast" label when a checklist item completes in < 60 minutes.',
  jsonb_build_object(
    'type', 'perf_event',
    'action', 'checklist.done',
    'lt_minutes', 60
  ),
  jsonb_build_object(
    'effect', 'label',
    'label', 'badge:LightningFast'
  )
)
on conflict (slug) do nothing;
