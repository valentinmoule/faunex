REVOKE ALL ON FUNCTION public.settle_league_group(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.league_join(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.league_add_points(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_league_group(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.league_join(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.league_add_points(uuid, integer) TO service_role;

REVOKE ALL ON FUNCTION public.my_league() FROM anon;
REVOKE ALL ON FUNCTION public.league_standings() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_league() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.league_standings() TO authenticated, service_role;