CREATE OR REPLACE FUNCTION public.capture_owner_fields_unchanged(p_id uuid, p_user_id uuid, p_status text, p_rarity text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.captures c
    WHERE c.id = p_id
      AND c.user_id = auth.uid()
      AND c.user_id = p_user_id
      AND c.status IS NOT DISTINCT FROM p_status
      AND c.rarity IS NOT DISTINCT FROM p_rarity
  );
$function$;
REVOKE ALL ON FUNCTION public.capture_owner_fields_unchanged(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capture_owner_fields_unchanged(uuid, uuid, text, text) TO authenticated;
ALTER POLICY "Users can update own captures" ON public.captures
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.capture_owner_fields_unchanged(id, user_id, status, rarity)
);
COMMENT ON FUNCTION public.capture_owner_fields_unchanged(uuid, uuid, text, text) IS 'Non-recursive owner UPDATE guard: compares stored protected fields while bypassing captures RLS; admin moderation retains its separate policy.';