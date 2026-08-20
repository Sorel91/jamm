-- Jamm beta: server-enforced upload limits, safe retention cleanup and query indexes.
-- Applied to production on 2026-08-20. Keep this migration for auditability.

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']::text[]
where id = 'jamm-documents';

create index if not exists catalog_audit_events_actor_id_idx on public.catalog_audit_events(actor_id);
create index if not exists journeys_vault_id_idx on public.journeys(vault_id);
create index if not exists vaults_owner_id_idx on public.vaults(owner_id);

drop policy if exists "Users manage own journey profiles" on public.journey_profiles;
create policy "Users manage own journey profiles"
on public.journey_profiles for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  ((select auth.uid()) = owner_id)
  and exists (
    select 1 from public.journeys j
    where j.id = journey_profiles.journey_id
      and j.owner_id = (select auth.uid())
  )
);

create schema if not exists jamm_internal;
revoke all on schema jamm_internal from public;

create or replace function jamm_internal.purge_expired_trash()
returns void
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
begin
  delete from storage.objects o
  using public.documents d
  where d.deleted_at is not null
    and d.deleted_at < now() - interval '90 days'
    and o.bucket_id = 'jamm-documents'
    and o.name = d.storage_path;

  delete from public.documents
  where deleted_at is not null
    and deleted_at < now() - interval '90 days';

  delete from public.journeys
  where deleted_at is not null
    and deleted_at < now() - interval '90 days';
end;
$$;

revoke all on function jamm_internal.purge_expired_trash() from public;

-- Schedule once daily, at 03:15 UTC.
do $$
declare scheduled_job_id bigint;
begin
  select jobid into scheduled_job_id
  from cron.job
  where jobname = 'jamm-purge-expired-trash';

  if scheduled_job_id is not null then
    perform cron.unschedule(scheduled_job_id);
  end if;

  perform cron.schedule(
    'jamm-purge-expired-trash',
    '15 3 * * *',
    $cron$select jamm_internal.purge_expired_trash();$cron$
  );
end;
$$;
