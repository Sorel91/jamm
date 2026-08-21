-- Aggregate operational metrics for the Jamlio backoffice.
-- This RPC intentionally exposes counts only. It never returns user identities,
-- document names, storage paths, or journey details.

create or replace function public.jamlio_admin_metrics()
returns table (
  vault_count bigint,
  document_count bigint,
  active_journey_count bigint,
  trashed_document_count bigint,
  trashed_journey_count bigint,
  catalog_entry_count bigint,
  verified_catalog_count bigint,
  review_catalog_count bigint,
  due_review_count bigint
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
    (select count(*) from public.documents where deleted_at is not null),
    (select count(*) from public.journeys where deleted_at is not null),
    (select count(*) from public.official_catalog_entries),
    (select count(*) from public.official_catalog_entries where source_status = 'verified'),
    (select count(*) from public.official_catalog_entries where source_status = 'to_review'),
    (select count(*) from public.official_catalog_entries where source_status = 'to_review' or review_due_at is null or review_due_at <= now());
end;
$$;

revoke all on function public.jamlio_admin_metrics() from public;
grant execute on function public.jamlio_admin_metrics() to authenticated;
