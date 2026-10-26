CREATE TABLE public.photo_contest_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  capture_id uuid NOT NULL UNIQUE REFERENCES public.captures(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
CREATE TABLE public.photo_contest_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.photo_contest_entries(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voter_id, week_start)
);
CREATE INDEX photo_contest_votes_entry_idx ON public.photo_contest_votes(entry_id);
CREATE TABLE public.photo_contest_winners (
  week_start date PRIMARY KEY,
  entry_id uuid,
  user_id uuid NOT NULL,
  capture_id uuid,
  votes integer NOT NULL DEFAULT 0,
  decided_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.photo_contest_entries TO authenticated;
GRANT SELECT ON public.photo_contest_winners TO authenticated, anon;
GRANT ALL ON public.photo_contest_entries, public.photo_contest_votes, public.photo_contest_winners TO service_role;
ALTER TABLE public.photo_contest_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_contest_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_contest_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own contest entries readable" ON public.photo_contest_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Winners are public" ON public.photo_contest_winners FOR SELECT TO authenticated, anon USING (true);

CREATE OR REPLACE FUNCTION public.contest_week(p_at timestamptz DEFAULT now())
RETURNS date LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT date_trunc('week', p_at AT TIME ZONE 'Europe/Paris')::date
$$;

CREATE OR REPLACE FUNCTION public.contest_finalize()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    GROUP BY e.id
    HAVING count(v.id) > 0
    ORDER BY count(v.id) DESC, e.created_at ASC
    LIMIT 1
    ON CONFLICT (week_start) DO NOTHING;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.submit_contest_photo(p_capture_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); c public.captures%ROWTYPE; wk date := public.contest_week(); new_id uuid;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO c FROM public.captures WHERE id = p_capture_id;
  IF NOT FOUND OR c.user_id <> u THEN RAISE EXCEPTION 'not_owner'; END IF;
  IF c.status <> 'approved' THEN RAISE EXCEPTION 'not_approved'; END IF;
  IF public.contest_week(c.created_at) <> wk THEN RAISE EXCEPTION 'not_this_week'; END IF;
  IF EXISTS (SELECT 1 FROM public.photo_contest_entries WHERE user_id = u AND week_start = wk) THEN RAISE EXCEPTION 'already_submitted'; END IF;
  INSERT INTO public.photo_contest_entries(user_id, capture_id, week_start) VALUES (u, p_capture_id, wk) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_contest_photo()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  DELETE FROM public.photo_contest_entries WHERE user_id = u AND week_start = public.contest_week();
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.cast_contest_vote(p_entry_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); e public.photo_contest_entries%ROWTYPE;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO e FROM public.photo_contest_entries WHERE id = p_entry_id;
  IF NOT FOUND OR e.week_start <> public.contest_week() - 7 THEN RAISE EXCEPTION 'voting_closed'; END IF;
  IF e.user_id = u THEN RAISE EXCEPTION 'own_photo'; END IF;
  INSERT INTO public.photo_contest_votes(voter_id, entry_id, week_start) VALUES (u, p_entry_id, e.week_start)
  ON CONFLICT (voter_id, week_start) DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'already_voted'; END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.contest_ballot()
RETURNS TABLE(entry_id uuid, capture_id uuid, user_id uuid, image_url text, animal_name text, scientific_name text, rarity text,
  display_name text, username text, avatar_url text, is_mine boolean, voted_for boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN RETURN; END IF;
  PERFORM public.contest_finalize();
  RETURN QUERY
  SELECT e.id, c.id, e.user_id, c.image_url, c.animal_name, c.scientific_name, c.rarity,
    p.display_name, p.username, p.avatar_url, e.user_id = u,
    EXISTS (SELECT 1 FROM public.photo_contest_votes v WHERE v.entry_id = e.id AND v.voter_id = u)
  FROM public.photo_contest_entries e
  JOIN public.captures c ON c.id = e.capture_id
  LEFT JOIN public.profiles p ON p.user_id = e.user_id
  WHERE e.week_start = public.contest_week() - 7
  ORDER BY md5(e.id::text || u::text);
END $$;

CREATE OR REPLACE FUNCTION public.contest_recent_winners(p_limit integer DEFAULT 6)
RETURNS TABLE(week_start date, capture_id uuid, user_id uuid, votes integer, image_url text, animal_name text, rarity text,
  display_name text, username text, avatar_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM public.contest_finalize();
  RETURN QUERY
  SELECT w.week_start, w.capture_id, w.user_id, w.votes, c.image_url, c.animal_name, c.rarity, p.display_name, p.username, p.avatar_url
  FROM public.photo_contest_winners w
  JOIN public.captures c ON c.id = w.capture_id
  LEFT JOIN public.profiles p ON p.user_id = w.user_id
  ORDER BY w.week_start DESC LIMIT LEAST(greatest(p_limit,1), 20);
END $$;

REVOKE EXECUTE ON FUNCTION public.contest_finalize() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_contest_photo(uuid), public.withdraw_contest_photo(), public.cast_contest_vote(uuid), public.contest_ballot(), public.contest_recent_winners(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_contest_photo(uuid), public.withdraw_contest_photo(), public.cast_contest_vote(uuid), public.contest_ballot(), public.contest_recent_winners(integer), public.contest_week(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.reward_eligibility(p_badge_id text, p_timezone text DEFAULT 'Europe/Paris'::text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE u uuid:=auth.uid(); stats jsonb; rule jsonb; target integer; progress integer:=0; xp integer; k text; cat text; best_rank bigint; r bigint; total integer; captured integer; z public.user_department_subscriptions%ROWTYPE;
BEGIN
 IF u IS NULL OR p_badge_id IS NULL OR length(p_badge_id)>200 THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RETURN NULL; END IF;
 IF starts_with(p_badge_id,'advent_') THEN
 SELECT final_badge_xp INTO xp FROM public.themed_collections t WHERE 'advent_'||t.id=p_badge_id AND t.event_kind='advent' AND (SELECT count(DISTINCT day) FROM public.advent_submissions WHERE collection_id=t.id AND user_id=u AND approved_at IS NOT NULL)=24;
 RETURN xp;
 END IF;
 SELECT definition->p_badge_id INTO rule FROM public.reward_security_rules WHERE rule_key='badges';
 IF rule IS NOT NULL THEN
 target:=(rule->>0)::integer; xp:=(rule->>1)::integer;
 WITH own AS (SELECT DISTINCT ON (lower(animal_name)) * FROM public.captures WHERE user_id=u AND status='approved' ORDER BY lower(animal_name),created_at DESC,id)
 SELECT jsonb_build_object('total',count(*),'geo',count(*) FILTER(WHERE latitude IS NOT NULL),'rare',count(*) FILTER(WHERE rarity IN ('rare','very_rare','ultra_rare','illustration_rare','special_rare','hyper_rare','epic','legendary','mythic')),'silver',count(*) FILTER(WHERE rarity IN ('very_rare','ultra_rare','illustration_rare','epic','legendary')),'gold',count(*) FILTER(WHERE rarity IN ('special_rare','hyper_rare','mythic')),'night',coalesce(bool_or(extract(hour FROM created_at AT TIME ZONE p_timezone)>=21 OR extract(hour FROM created_at AT TIME ZONE p_timezone)<5),false),'early',coalesce(bool_or(extract(hour FROM created_at AT TIME ZONE p_timezone)>=5 AND extract(hour FROM created_at AT TIME ZONE p_timezone)<8),false),'categories',count(DISTINCT nullif(regexp_replace(coalesce(category,''),'\s*\(monde\)$','','i'),''))) INTO stats FROM own;
 CASE
 WHEN p_badge_id='first_capture' OR p_badge_id LIKE 'explorer_%' THEN progress:=(stats->>'total')::integer;
 WHEN p_badge_id LIKE 'level_%' THEN SELECT level INTO progress FROM public.profiles WHERE user_id=u;
 WHEN p_badge_id LIKE 'regions_%' THEN SELECT regions_explored INTO progress FROM public.profiles WHERE user_id=u;
 WHEN p_badge_id='geo_10' THEN progress:=(stats->>'geo')::integer;
 WHEN p_badge_id='night_owl' THEN progress:=CASE WHEN (stats->>'night')::boolean THEN 1 ELSE 0 END;
 WHEN p_badge_id='early_bird' THEN progress:=CASE WHEN (stats->>'early')::boolean THEN 1 ELSE 0 END;
 WHEN p_badge_id='categories_all' THEN progress:=(stats->>'categories')::integer;
 WHEN p_badge_id LIKE 'rare_%' THEN progress:=(stats->>'rare')::integer;
 WHEN p_badge_id LIKE 'legendary_%' THEN progress:=(stats->>'silver')::integer;
 WHEN p_badge_id LIKE 'mythic_%' THEN progress:=(stats->>'gold')::integer;
 WHEN p_badge_id LIKE 'social_%' THEN SELECT count(*) INTO progress FROM public.explorer_follows WHERE follower_id=u;
 WHEN p_badge_id LIKE 'followers_%' THEN SELECT count(*) INTO progress FROM public.explorer_follows WHERE following_id=u;
 WHEN p_badge_id='premium_member' THEN progress:=CASE WHEN public.is_premium(u) THEN 1 ELSE 0 END;
 WHEN p_badge_id='community_member' THEN progress:=1;
 WHEN p_badge_id='photo_of_week' THEN progress:=CASE WHEN EXISTS(SELECT 1 FROM public.photo_contest_winners w WHERE w.user_id=u) THEN 1 ELSE 0 END;
 WHEN p_badge_id IN ('podium_any','top10_any') THEN
 FOR cat IN SELECT DISTINCT regexp_replace(category,'\s*\(monde\)$','','i') FROM public.captures WHERE user_id=u AND status='approved' AND coalesce(category,'')<>'' LOOP
 SELECT rank INTO r FROM public.my_category_rank(cat); IF r IS NOT NULL AND (best_rank IS NULL OR r<best_rank) THEN best_rank:=r; END IF;
 END LOOP;
 progress:=CASE WHEN best_rank<=CASE WHEN p_badge_id='podium_any' THEN 3 ELSE 10 END THEN 1 ELSE 0 END;
 ELSE
 k:=CASE split_part(p_badge_id,'_',1) WHEN 'birds' THEN 'oiseau' WHEN 'mammals' THEN 'mammif' WHEN 'insects' THEN 'insecte' WHEN 'reptiles' THEN 'reptile' WHEN 'amphibians' THEN 'amphibien' WHEN 'fishes' THEN 'poisson' WHEN 'arachnids' THEN 'arachnide' WHEN 'molluscs' THEN 'mollusque' WHEN 'crustaceans' THEN 'crustace' END;
 IF k IS NULL THEN RETURN NULL; END IF;
 SELECT count(DISTINCT lower(animal_name)) INTO progress FROM public.captures WHERE user_id=u AND status='approved' AND strpos(public.reward_normalize(category),k)>0;
 END CASE;
 IF coalesce(progress,0)>=target THEN RETURN LEAST(xp,500); END IF;
 RETURN NULL;
 ELSIF starts_with(p_badge_id,'rank1_') THEN
 cat:=substring(p_badge_id FROM 7);
 IF NOT EXISTS(SELECT 1 FROM public.captures WHERE user_id=u AND status='approved' AND lower(regexp_replace(category,'\s*\(monde\)$','','i'))=cat) THEN RETURN NULL; END IF;
 SELECT rank INTO r FROM public.my_category_rank(cat);
 IF r=1 THEN RETURN 500; END IF;
 ELSIF starts_with(p_badge_id,'collection_') THEN
 k:=substring(p_badge_id FROM 12);
 WITH members AS (SELECT a.name FROM public.animals a JOIN public.reward_catalogue_groups g ON g.animal_id=a.id WHERE g.group_key=k)
 SELECT count(*),count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.captures c WHERE c.user_id=u AND c.status='approved' AND lower(c.animal_name)=lower(m.name))) INTO total,captured FROM members m;
 IF total>=2 AND captured>=total THEN RETURN LEAST(500,100+total*20); END IF;
 ELSIF starts_with(p_badge_id,'zone_') THEN
 IF substring(p_badge_id FROM 6) !~ '^[0-9a-fA-F-]{36}$' THEN RETURN NULL; END IF;
 SELECT * INTO z FROM public.user_department_subscriptions WHERE id::text=substring(p_badge_id FROM 6) AND user_id=u;
 IF NOT FOUND THEN RETURN NULL; END IF;
 WITH members AS (SELECT a.name,a.rarity,EXISTS(SELECT 1 FROM public.captures c WHERE c.user_id=u AND c.status='approved' AND lower(c.animal_name)=lower(a.name)) AS owned FROM public.animals a WHERE EXISTS(SELECT 1 FROM public.animal_departments d WHERE d.department_code=z.department_code AND lower(d.animal_name)=lower(a.name))), chosen AS (
 SELECT * FROM members WHERE z.kind<>'city' OR owned OR (NOT public.reward_city_match(name,'city_exclude') AND public.reward_city_match(name,'city_include')) ORDER BY CASE WHEN z.kind='city' AND public.reward_city_match(name,'city_iconic') THEN 0 ELSE 1 END, CASE rarity WHEN 'common' THEN 0 WHEN 'uncommon' THEN 1 WHEN 'rare' THEN 2 WHEN 'very_rare' THEN 3 WHEN 'ultra_rare' THEN 4 WHEN 'illustration_rare' THEN 5 WHEN 'special_rare' THEN 6 WHEN 'hyper_rare' THEN 7 ELSE 4 END,name LIMIT CASE WHEN z.kind='city' THEN 55 ELSE 2147483647 END)
 SELECT count(*),count(*) FILTER(WHERE owned) INTO total,captured FROM chosen;
 IF total>0 AND captured>=total THEN RETURN LEAST(500,100+total*20); END IF;
 END IF;
 RETURN NULL;
END $function$;