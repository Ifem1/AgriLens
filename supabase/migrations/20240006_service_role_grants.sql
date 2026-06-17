-- Grant service_role full access to all tables
-- Required for Edge Functions that use the service role key

grant all on public.user_profiles       to service_role;
grant all on public.wallets             to service_role;
grant all on public.organizations       to service_role;
grant all on public.org_members         to service_role;
grant all on public.subscriptions       to service_role;
grant all on public.crops               to service_role;
grant all on public.policies            to service_role;
grant all on public.agents              to service_role;
grant all on public.validation_requests to service_role;
grant all on public.validation_results  to service_role;
grant all on public.escalations         to service_role;
grant all on public.audit_events        to service_role;

-- Also grant usage on sequences
grant usage on all sequences in schema public to service_role;
