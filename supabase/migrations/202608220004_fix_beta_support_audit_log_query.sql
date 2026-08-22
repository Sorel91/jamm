-- Correct the support-access journal projection.
-- The beta support console must show every recorded consultation.

create or replace function public.jamlio_beta_support_audit(target_user_id uuid)
returns table (event_at timestamptz, action text, admin_email text, document_name text, reason text)
language plpgsql security definer
set search_path = public, auth, private, pg_catalog
as $$
begin
  if not private.is_jamm_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select l.created_at, l.action, u.email::text, d.display_name, l.reason
  from public.beta_support_access_logs l
  left join auth.users u on u.id = l.admin_id
  left join public.documents d on d.id = l.document_id
  where l.target_user_id = jamlio_beta_support_audit.target_user_id
  order by l.created_at desc
  limit 100;
end;
$$;

revoke all on function public.jamlio_beta_support_audit(uuid) from public, anon;
grant execute on function public.jamlio_beta_support_audit(uuid) to authenticated;
