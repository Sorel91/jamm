-- Make operational metrics and beta-support summaries explicit.
-- A source without a planned review is not necessarily a source requiring verification.

drop function if exists public.jamlio_admin_metrics();

create function public.jamlio_admin_metrics()
returns table (
  vault_count bigint,
  document_count bigint,
  active_journey_count bigint,
  completed_journey_count bigint,
  trashed_document_count bigint,
  trashed_journey_count bigint,
  catalog_entry_count bigint,
  verified_catalog_count bigint,
  review_catalog_count bigint,
  due_review_count bigint,
  sources_without_review_date bigint,
  overdue_review_count bigint
)
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
begin
  if not private.is_jamm_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.vaults),
    (select count(*) from public.documents where deleted_at is null),
    (select count(*) from public.journeys where status = 'active' and deleted_at is null),
    (select count(*) from public.journeys where status = 'completed' and deleted_at is null),
    (select count(*) from public.documents where deleted_at is not null),
    (select count(*) from public.journeys where deleted_at is not null),
    (select count(*) from public.official_catalog_entries),
    (select count(*) from public.official_catalog_entries where source_status = 'verified'),
    (select count(*) from public.official_catalog_entries where source_status = 'to_review'),
    (select count(*) from public.official_catalog_entries where source_status = 'to_review' or review_due_at <= now()),
    (select count(*) from public.official_catalog_entries where review_due_at is null),
    (select count(*) from public.official_catalog_entries where review_due_at <= now());
end;
$$;

revoke all on function public.jamlio_admin_metrics() from public, anon;
grant execute on function public.jamlio_admin_metrics() to authenticated;

drop function if exists public.jamlio_beta_support_users(text);

create function public.jamlio_beta_support_users(search_term text default null)
returns table (
  user_id uuid,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  document_count bigint,
  journey_count bigint,
  active_journey_count bigint
)
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog
as $$
begin
  if not private.is_jamm_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.email_confirmed_at,
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.documents d where d.owner_id = u.id and d.deleted_at is null),
    (select count(*) from public.journeys j where j.owner_id = u.id),
    (select count(*) from public.journeys j where j.owner_id = u.id and j.deleted_at is null and j.status = 'active')
  from auth.users u
  where coalesce(nullif(trim(search_term), ''), '') = ''
     or lower(coalesce(u.email, '')) like '%' || lower(trim(search_term)) || '%'
  order by coalesce(u.last_sign_in_at, u.created_at) desc
  limit 100;
end;
$$;

revoke all on function public.jamlio_beta_support_users(text) from public, anon;
grant execute on function public.jamlio_beta_support_users(text) to authenticated;
