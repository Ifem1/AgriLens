-- Add visibility and is_paid columns to validation_requests
alter table public.validation_requests
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private')),
  add column if not exists is_paid boolean not null default false;

-- Drop the old org-only view policy and replace with one that also allows public read
drop policy if exists "view_org_requests" on public.validation_requests;

create policy "view_validation_requests" on public.validation_requests
  for select
  using (
    visibility = 'public'
    or org_id = public.get_user_org_id()
  );

-- Public results: all authenticated users can read validation_results for public requests
drop policy if exists "view_org_results" on public.validation_results;

create policy "view_validation_results" on public.validation_results
  for select
  using (
    exists (
      select 1 from public.validation_requests r
      where r.id = request_id
        and (r.visibility = 'public' or r.org_id = public.get_user_org_id())
    )
  );
