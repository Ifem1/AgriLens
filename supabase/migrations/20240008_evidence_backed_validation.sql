-- Evidence-backed GenLayer validation fields

alter table public.validation_requests
  add column if not exists farm_location text,
  add column if not exists public_evidence_url text,
  add column if not exists photo_evidence_url text,
  add column if not exists weather_source_url text,
  add column if not exists agro_source_url text,
  add column if not exists proposed_treatment text,
  add column if not exists pesticide_name text,
  add column if not exists pesticide_guidance_url text;

alter table public.validation_results
  drop constraint if exists validation_results_consensus_outcome_check;

alter table public.validation_results
  add constraint validation_results_consensus_outcome_check
  check (
    consensus_outcome in (
      'approved',
      'rejected',
      'needs_expert_review',
      'low_confidence',
      'escalated',
      'policy_blocked',
      'insufficient_evidence'
    )
  );
