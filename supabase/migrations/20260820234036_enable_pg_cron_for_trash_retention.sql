-- Jamm beta: enable the daily trash-retention job.
-- Applied to production on 2026-08-20 at 23:40 UTC.

create extension if not exists pg_cron with schema pg_catalog;

-- Replace any previous job under the same stable name.
select cron.unschedule(jobid)
from cron.job
where jobname = 'jamm_purge_expired_trash';

select cron.schedule(
  'jamm_purge_expired_trash',
  '15 3 * * *',
  $$select jamm_internal.purge_expired_trash();$$
);
