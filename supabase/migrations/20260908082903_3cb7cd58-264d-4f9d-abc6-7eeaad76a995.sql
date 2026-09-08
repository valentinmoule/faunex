REVOKE ALL ON FUNCTION public.catalogue_name_for_binomial(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_catalogue_name() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_shared_domestic_binomial(text) FROM anon, authenticated;