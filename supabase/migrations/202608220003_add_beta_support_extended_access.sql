-- Beta-only extended support access.
-- It is read-only for customer data and available only to Jamlio administrators.
-- Every account detail or document access is journalised.

create table if not exists public.beta_support_access_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  target_user_id uuid not null,
  action text not null check (action in ('account_view', 'document_open', 'document_download')),
  document_id uuid references public.documents(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.beta_support_access_logs enable row level security;

drop policy if exists "Beta admins read support access logs" on public.beta_support_access_logs;
create policy "Beta admins read support access logs"
on public.beta_support_access_logs
for select to authenticated
using (private.is_jamm_admin());

drop policy if exists "Beta admins can read Jamlio files" on storage.objects;
create policy "Beta admins can read Jamlio files"
on storage.objects
for select to authenticated
using (bucket_id = 'jamm-documents' and private.is_jamm_admin());

create or replace function public.jamlio_beta_support_users(search_term text default null)
returns table (user_id uuid, email text, email_confirmed_at timestamptz, created_at timestamptz, last_sign_in_at timestamptz, document_count bigint, active_journey_count bigint)
language plpgsql security definer
set search_path = public, auth, private, pg_catalog
as $$
begin
  if not private.is_jamm_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  select u.id, u.email::text, u.email_confirmed_at, u.created_at, u.last_sign_in_at,
    (select count(*) from public.documents d where d.owner_id = u.id and d.deleted_at is null),
    (select count(*) from public.journeys j where j.owner_id = u.id and j.deleted_at is null and j.status = 'active')
  from auth.users u
  where coalesce(nullif(trim(search_term), ''), '') = ''
     or lower(coalesce(u.email, '')) like '%' || lower(trim(search_term)) || '%'
  order by coalesce(u.last_sign_in_at, u.created_at) desc
  limit 100;
end;
$$;

create or replace function public.jamlio_beta_support_detail(target_user_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public, auth, private, pg_catalog
as $$
declare target_email text; result jsonb;
begin
  if not private.is_jamm_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  select u.email into target_email from auth.users u where u.id = target_user_id;
  if target_email is null then raise exception 'user not found' using errcode = 'P0002'; end if;
  insert into public.beta_support_access_logs (admin_id, target_user_id, action, reason)
  values (auth.uid(), target_user_id, 'account_view', 'Consultation support bêta');
  select jsonb_build_object(
    'account', (select jsonb_build_object('id',u.id,'email',u.email,'email_confirmed_at',u.email_confirmed_at,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at) from auth.users u where u.id=target_user_id),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'display_name',d.display_name,'document_type',d.document_type,'storage_path',d.storage_path,'content_type',d.content_type,'byte_size',d.byte_size,'issued_at',d.issued_at,'expires_at',d.expires_at,'holder_name',d.holder_name,'issuer_country',d.issuer_country,'archived_at',d.archived_at,'deleted_at',d.deleted_at,'created_at',d.created_at,'updated_at',d.updated_at) order by d.created_at desc) from public.documents d where d.owner_id=target_user_id), '[]'::jsonb),
    'journeys', coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'code',j.code,'status',j.status,'deleted_at',j.deleted_at,'created_at',j.created_at,'updated_at',j.updated_at,'profile',(select jsonb_build_object('department',jp.department,'prefecture_name',jp.prefecture_name,'permit_category',jp.permit_category,'expiry_date',jp.expiry_date,'situation_answers',jp.situation_answers,'official_source_url',jp.official_source_url,'source_checked_at',jp.source_checked_at,'source_status',jp.source_status) from public.journey_profiles jp where jp.journey_id=j.id)) order by j.updated_at desc) from public.journeys j where j.owner_id=target_user_id), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.jamlio_beta_support_record_access(target_user_id uuid, access_action text, target_document_id uuid default null, access_reason text default null)
returns void
language plpgsql security definer
set search_path = public, private, pg_catalog
as $$
begin
  if not private.is_jamm_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  if access_action not in ('document_open', 'document_download') then raise exception 'invalid action' using errcode = '22023'; end if;
  if target_document_id is null then raise exception 'document required' using errcode = '22023'; end if;
  if not exists (select 1 from public.documents d where d.id=target_document_id and d.owner_id=target_user_id) then raise exception 'document does not belong to user' using errcode = '42501'; end if;
  insert into public.beta_support_access_logs (admin_id,target_user_id,action,document_id,reason)
  values (auth.uid(),target_user_id,access_action,target_document_id,nullif(trim(access_reason),''));
end;
$$;

create or replace function public.jamlio_beta_support_audit(target_user_id uuid)
returns table (event_at timestamptz, action text, admin_email text, document_name text, reason text)
language plpgsql security definer
set search_path = public, auth, private, pg_catalog
as $$
begin
  if not private.is_jamm_admin() then raise exception 'not authorized' using errcode = '42501'; end if;
  return query
  select l.created_at,u.action,u.email::text,d.display_name,l.reason
  from public.beta_support_access_logs l
  left join auth.users u on u.id=l.admin_id
  left join public.documents d on d.id=l.document_id
  where l.target_user_id=target_user_id
  order by l.created_at desc
  limit 100;
end;
$$;

revoke all on function public.jamlio_beta_support_users(text) from public, anon;
revoke all on function public.jamlio_beta_support_detail(uuid) from public, anon;
revoke all on function public.jamlio_beta_support_record_access(uuid, text, uuid, text) from public, anon;
revoke all on function public.jamlio_beta_support_audit(uuid) from public, anon;
grant execute on function public.jamlio_beta_support_users(text) to authenticated;
grant execute on function public.jamlio_beta_support_detail(uuid) to authenticated;
grant execute on function public.jamlio_beta_support_record_access(uuid, text, uuid, text) to authenticated;
grant execute on function public.jamlio_beta_support_audit(uuid) to authenticated;
