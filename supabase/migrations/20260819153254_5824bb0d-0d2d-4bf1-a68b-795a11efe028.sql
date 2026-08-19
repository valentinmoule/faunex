REVOKE ALL ON FUNCTION public.canonical_animal_name(text) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_canonical_animal_name() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonical_animal_name(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_canonical_animal_name() TO service_role;