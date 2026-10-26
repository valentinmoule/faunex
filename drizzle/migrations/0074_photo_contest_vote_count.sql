DROP FUNCTION public.contest_ballot();
CREATE OR REPLACE FUNCTION public.contest_ballot()
 RETURNS TABLE(entry_id uuid, capture_id uuid, user_id uuid, image_url text, animal_name text, scientific_name text, rarity text, display_name text, username text, avatar_url text, is_mine boolean, voted_for boolean, vote_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN RETURN; END IF;
  PERFORM public.contest_finalize();
  RETURN QUERY
  SELECT e.id, c.id, e.user_id, c.image_url, c.animal_name, c.scientific_name, c.rarity,
    p.display_name, p.username, p.avatar_url, e.user_id = u,
    EXISTS (SELECT 1 FROM public.photo_contest_votes v WHERE v.entry_id = e.id AND v.voter_id = u),
    (SELECT count(*) FROM public.photo_contest_votes v2 WHERE v2.entry_id = e.id)
  FROM public.photo_contest_entries e
  JOIN public.captures c ON c.id = e.capture_id
  LEFT JOIN public.profiles p ON p.user_id = e.user_id
  WHERE e.week_start = public.contest_week() - 7
  ORDER BY md5(e.id::text || u::text);
END $function$;
REVOKE ALL ON FUNCTION public.contest_ballot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contest_ballot() TO authenticated, service_role;