-- Defense in depth: the aggregate backoffice metrics RPC is for signed-in users only.
-- The function itself also verifies the caller is a Jamlio administrator.
revoke execute on function public.jamlio_admin_metrics() from anon;
revoke execute on function public.jamlio_admin_metrics() from public;
grant execute on function public.jamlio_admin_metrics() to authenticated;
