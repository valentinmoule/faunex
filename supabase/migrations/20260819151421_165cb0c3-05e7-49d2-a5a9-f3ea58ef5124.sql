REVOKE ALL ON FUNCTION public.collection_rule_taxa(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_collection_membership(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_refresh_collections() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collection_rule_taxa(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_collection_membership(uuid) TO service_role;