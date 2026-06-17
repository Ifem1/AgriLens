-- AgriLens — Row Level Security Policies

-- Enable RLS on every table
alter table public.user_profiles       enable row level security;
alter table public.wallets             enable row level security;
alter table public.organizations       enable row level security;
alter table public.org_members         enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.crops               enable row level security;
alter table public.policies            enable row level security;
alter table public.agents              enable row level security;
alter table public.validation_requests enable row level security;
alter table public.validation_results  enable row level security;
alter table public.escalations         enable row level security;
alter table public.audit_events        enable row level security;

-- Helper: returns the caller's org_id (first org they belong to)
create or replace function public.get_user_org_id()
returns uuid
language sql
security definer
stable
as $$
  select org_id
  from   public.org_members
  where  user_id = auth.uid()
  limit  1;
$$;

-- ─── user_profiles ───────────────────────────────────────────────────────────
create policy "view_own_profile"   on public.user_profiles
  for select using (id = auth.uid());
create policy "update_own_profile" on public.user_profiles
  for update using (id = auth.uid());
create policy "insert_own_profile" on public.user_profiles
  for insert with check (id = auth.uid());

-- ─── wallets ─────────────────────────────────────────────────────────────────
create policy "view_own_wallet"   on public.wallets
  for select using (user_id = auth.uid());
create policy "insert_own_wallet" on public.wallets
  for insert with check (user_id = auth.uid());

-- ─── organizations ───────────────────────────────────────────────────────────
create policy "view_own_org" on public.organizations
  for select using (
    id in (select org_id from public.org_members where user_id = auth.uid())
  );
create policy "update_own_org" on public.organizations
  for update using (
    id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- ─── org_members ─────────────────────────────────────────────────────────────
create policy "view_org_members" on public.org_members
  for select using (
    org_id in (select org_id from public.org_members where user_id = auth.uid())
  );

-- ─── subscriptions ───────────────────────────────────────────────────────────
create policy "view_own_subscription" on public.subscriptions
  for select using (org_id = public.get_user_org_id());

-- ─── crops (public reference data) ───────────────────────────────────────────
create policy "crops_public_read" on public.crops
  for select using (true);

-- ─── policies ────────────────────────────────────────────────────────────────
create policy "view_org_policies"   on public.policies
  for select using (org_id = public.get_user_org_id());
create policy "insert_org_policies" on public.policies
  for insert with check (org_id = public.get_user_org_id());
create policy "update_org_policies" on public.policies
  for update using (org_id = public.get_user_org_id());
create policy "delete_org_policies" on public.policies
  for delete using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- ─── agents ──────────────────────────────────────────────────────────────────
create policy "view_org_agents"   on public.agents
  for select using (org_id = public.get_user_org_id());
create policy "insert_org_agents" on public.agents
  for insert with check (org_id = public.get_user_org_id());
create policy "update_org_agents" on public.agents
  for update using (org_id = public.get_user_org_id());

-- ─── validation_requests ─────────────────────────────────────────────────────
create policy "view_org_requests"   on public.validation_requests
  for select using (org_id = public.get_user_org_id());
create policy "insert_org_requests" on public.validation_requests
  for insert with check (org_id = public.get_user_org_id());

-- ─── validation_results ──────────────────────────────────────────────────────
create policy "view_org_results" on public.validation_results
  for select using (
    request_id in (
      select id from public.validation_requests
      where org_id = public.get_user_org_id()
    )
  );

-- ─── escalations ─────────────────────────────────────────────────────────────
create policy "view_org_escalations" on public.escalations
  for select using (
    request_id in (
      select id from public.validation_requests
      where org_id = public.get_user_org_id()
    )
  );
create policy "update_org_escalations" on public.escalations
  for update using (
    request_id in (
      select id from public.validation_requests
      where org_id = public.get_user_org_id()
    )
  );

-- ─── audit_events ────────────────────────────────────────────────────────────
create policy "view_org_audit" on public.audit_events
  for select using (org_id = public.get_user_org_id());
