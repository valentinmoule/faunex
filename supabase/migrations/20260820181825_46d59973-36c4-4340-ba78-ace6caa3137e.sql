REVOKE ALL ON FUNCTION public.acquire_background_job(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_background_job(text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pause_background_job(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_background_job(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_background_job(text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_background_job(text, text) TO service_role;