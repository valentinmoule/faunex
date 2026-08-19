REVOKE ALL ON FUNCTION public.match_taxon(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_taxon(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.link_capture_taxon() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_capture_taxon() TO service_role;