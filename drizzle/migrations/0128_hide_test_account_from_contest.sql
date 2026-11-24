CREATE OR REPLACE FUNCTION public.contest_finalize()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE wk date;
BEGIN
  FOR wk IN
    SELECT DISTINCT e.week_start FROM public.photo_contest_entries e
    WHERE e.week_start + 14 <= public.contest_week()
      AND NOT EXISTS (SELECT 1 FROM public.photo_contest_winners w WHERE w.week_start = e.week_start)
  LOOP
    INSERT INTO public.photo_contest_winners(week_start, entry_id, user_id, capture_id, votes)
    SELECT e.week_start, e.id, e.user_id, e.capture_id, count(v.id)
    FROM public.photo_contest_entries e
    LEFT JOIN public.photo_contest_votes v ON v.entry_id = e.id
    WHERE e.week_start = wk
      AND NOT EXISTS (SELECT 1 FROM auth.users tu WHERE tu.id = e.user_id AND lower(tu.email) = 'valentinmoulay+test@gmail.com')
    GROUP BY e.id
    HAVING count(v.id) > 0
    ORDER BY count(v.id) DESC, e.created_at ASC
    LIMIT 1
    ON CONFLICT (week_start) DO NOTHING;
  END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.contest_recent_winners(p_limit integer DEFAULT 6)
RETURNS TABLE(week_start date, capture_id uuid, user_id uuid, votes integer, image_url text, animal_name text, rarity text, display_name text, username text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM public.contest_finalize();
  RETURN QUERY
  SELECT w.week_start, w.capture_id, w.user_id, w.votes, c.image_url, c.animal_name, c.rarity, p.display_name, p.username, p.avatar_url
  FROM public.photo_contest_winners w
  JOIN public.captures c ON c.id = w.capture_id
  LEFT JOIN public.profiles p ON p.user_id = w.user_id
  WHERE NOT EXISTS (SELECT 1 FROM auth.users tu WHERE tu.id = w.user_id AND lower(tu.email) = 'valentinmoulay+test@gmail.com')
  ORDER BY w.week_start DESC LIMIT LEAST(greatest(p_limit,1), 20);
END $function$;

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
    AND (e.user_id = u OR NOT EXISTS (SELECT 1 FROM auth.users tu WHERE tu.id = e.user_id AND lower(tu.email) = 'valentinmoulay+test@gmail.com'))
  ORDER BY md5(e.id::text || u::text);
END $function$;