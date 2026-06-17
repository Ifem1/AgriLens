-- Grant authenticated role access to all tables (RLS still controls row-level access)
grant select, insert, update, delete on public.user_profiles       to authenticated;
grant select, insert, update, delete on public.wallets             to authenticated;
grant select, insert, update, delete on public.organizations       to authenticated;
grant select, insert, update, delete on public.org_members         to authenticated;
grant select, insert, update, delete on public.subscriptions       to authenticated;
grant select                         on public.crops               to authenticated;
grant select, insert, update, delete on public.policies            to authenticated;
grant select, insert, update, delete on public.agents              to authenticated;
grant select, insert, update, delete on public.validation_requests to authenticated;
grant select, insert, update, delete on public.validation_results  to authenticated;
grant select, insert, update, delete on public.escalations         to authenticated;
grant select, insert, update, delete on public.audit_events        to authenticated;

grant usage on all sequences in schema public to authenticated;

-- Also grant anon read access to public validation data (community knowledge base)
grant select on public.validation_requests to anon;
grant select on public.validation_results  to anon;
grant select on public.crops               to anon;
