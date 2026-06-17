-- AgriLens — Initial Schema
-- Run this first in the Supabase SQL editor

create extension if not exists "uuid-ossp";

-- ─── User Profiles ───────────────────────────────────────────────────────────
create table public.user_profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now() not null
);

-- ─── Wallets ─────────────────────────────────────────────────────────────────
create table public.wallets (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references auth.users(id) on delete cascade not null unique,
  public_address        text not null unique,
  encrypted_private_key text not null,
  created_at            timestamptz default now() not null
);

-- ─── Organizations ───────────────────────────────────────────────────────────
create table public.organizations (
  id         uuid default uuid_generate_v4() primary key,
  name       text not null,
  slug       text not null unique,
  country    text,
  region     text,
  plan_tier  text not null default 'free'
               check (plan_tier in ('free','starter','pro','enterprise')),
  is_active  boolean default true not null,
  created_at timestamptz default now() not null
);

-- ─── Org Members ─────────────────────────────────────────────────────────────
create table public.org_members (
  id        uuid default uuid_generate_v4() primary key,
  org_id    uuid references public.organizations(id) on delete cascade not null,
  user_id   uuid references auth.users(id) on delete cascade not null,
  role      text not null default 'member'
              check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz default now() not null,
  unique (org_id, user_id)
);

-- ─── Subscriptions ───────────────────────────────────────────────────────────
create table public.subscriptions (
  id                   uuid default uuid_generate_v4() primary key,
  org_id               uuid references public.organizations(id) on delete cascade not null unique,
  plan_tier            text not null default 'free',
  status               text not null default 'active'
                         check (status in ('active','past_due','cancelled')),
  validations_used     integer default 0 not null,
  validations_limit    integer default 20 not null,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  created_at           timestamptz default now() not null
);

-- ─── Crops (reference data) ──────────────────────────────────────────────────
create table public.crops (
  id              uuid default uuid_generate_v4() primary key,
  name            text not null unique,
  scientific_name text,
  growth_stages   text[] not null default '{}',
  created_at      timestamptz default now() not null
);

-- ─── Policies ────────────────────────────────────────────────────────────────
create table public.policies (
  id         uuid default uuid_generate_v4() primary key,
  org_id     uuid references public.organizations(id) on delete cascade not null,
  name       text not null,
  version    integer not null default 1,
  region     text,
  rules      jsonb not null default '{}',
  is_active  boolean default true not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

-- ─── Agents ──────────────────────────────────────────────────────────────────
create table public.agents (
  id           uuid default uuid_generate_v4() primary key,
  org_id       uuid references public.organizations(id) on delete cascade not null,
  name         text not null,
  description  text,
  on_chain_id  text,
  is_active    boolean default true not null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now() not null
);

-- ─── Validation Requests ─────────────────────────────────────────────────────
create table public.validation_requests (
  id               uuid default uuid_generate_v4() primary key,
  org_id           uuid references public.organizations(id) on delete cascade not null,
  agent_id         uuid references public.agents(id) on delete set null,
  submitted_by     uuid references auth.users(id) on delete set null,
  crop_id          uuid references public.crops(id) on delete set null,
  crop_stage       text not null,
  photo_url        text,
  farmer_notes     text,
  weather_snapshot jsonb,
  policy_id        uuid references public.policies(id) on delete set null,
  genlayer_tx_hash text,
  status           text not null default 'pending'
                     check (status in ('pending','validating','approved','failed','escalated','regenerating')),
  created_at       timestamptz default now() not null
);

-- ─── Validation Results ──────────────────────────────────────────────────────
create table public.validation_results (
  id                   uuid default uuid_generate_v4() primary key,
  request_id           uuid references public.validation_requests(id) on delete cascade not null unique,
  consensus_outcome    text not null
                         check (consensus_outcome in ('approved','low_confidence','escalated','policy_blocked','insufficient_evidence')),
  recommended_treatment text not null,
  confidence_score     integer check (confidence_score between 0 and 100),
  risk_score           integer check (risk_score between 0 and 100),
  validator_votes      jsonb not null default '[]',
  reasoning            text,
  on_chain_tx_hash     text,
  created_at           timestamptz default now() not null
);

-- ─── Escalations ─────────────────────────────────────────────────────────────
create table public.escalations (
  id          uuid default uuid_generate_v4() primary key,
  request_id  uuid references public.validation_requests(id) on delete cascade not null,
  assigned_to uuid references auth.users(id) on delete set null,
  reason      text,
  resolution  text,
  resolved_at timestamptz,
  created_at  timestamptz default now() not null
);

-- ─── Audit Events ────────────────────────────────────────────────────────────
create table public.audit_events (
  id          uuid default uuid_generate_v4() primary key,
  org_id      uuid references public.organizations(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  metadata    jsonb,
  created_at  timestamptz default now() not null
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index idx_validation_requests_org_id    on public.validation_requests(org_id);
create index idx_validation_requests_status    on public.validation_requests(status);
create index idx_validation_requests_created   on public.validation_requests(created_at desc);
create index idx_validation_results_request_id on public.validation_results(request_id);
create index idx_audit_events_org_id           on public.audit_events(org_id);
create index idx_audit_events_created          on public.audit_events(created_at desc);
create index idx_org_members_user_id           on public.org_members(user_id);
create index idx_escalations_request_id        on public.escalations(request_id);
