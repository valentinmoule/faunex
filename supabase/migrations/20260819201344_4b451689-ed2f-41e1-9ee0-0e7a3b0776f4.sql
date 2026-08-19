REVOKE EXECUTE ON FUNCTION public.update_last_login_at() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.update_last_login_at() TO postgres, service_role;