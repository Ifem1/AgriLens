-- AgriLens — Helper Functions

-- Atomically increments validations_used on a subscription row.
-- Called by submit-validation Edge Function after a successful validation.
create or replace function public.increment_validations_used(org_id_param uuid)
returns void
language sql
security definer
as $$
  update public.subscriptions
  set    validations_used = validations_used + 1
  where  org_id = org_id_param;
$$;

-- Realtime: enable publication on tables that need live updates
drop publication if exists supabase_realtime;
create publication supabase_realtime for table
  public.validation_requests,
  public.validation_results,
  public.escalations;
