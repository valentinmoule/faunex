CREATE TEMP TABLE _pop AS
SELECT public.normalize_animal_label(animal_name) AS k, count(DISTINCT user_id) AS finders
FROM public.captures
WHERE status = 'approved'
GROUP BY 1;
CREATE INDEX ON _pop(k);

CREATE OR REPLACE FUNCTION pg_temp.map_rarity(p_old text, p_finders bigint)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(coalesce(p_old,'common'))
    WHEN 'common' THEN CASE WHEN coalesce(p_finders,0) >= 5 THEN 'common' ELSE 'uncommon' END
    WHEN 'uncommon' THEN 'uncommon'
    WHEN 'rare' THEN CASE WHEN coalesce(p_finders,0) >= 3 THEN 'rare' ELSE 'very_rare' END
    WHEN 'epic' THEN CASE WHEN coalesce(p_finders,0) >= 2 THEN 'ultra_rare' ELSE 'illustration_rare' END
    WHEN 'legendary' THEN 'special_rare'
    WHEN 'mythic' THEN CASE WHEN coalesce(p_finders,0) >= 2 THEN 'special_rare' ELSE 'hyper_rare' END
    ELSE 'common' END
$$;

ALTER TABLE public.taxa DISABLE TRIGGER USER;
ALTER TABLE public.animals DISABLE TRIGGER USER;
ALTER TABLE public.captures DISABLE TRIGGER USER;

UPDATE public.taxa t
SET rarity = pg_temp.map_rarity(t.rarity, p.finders)
FROM _pop p
WHERE p.k = public.normalize_animal_label(t.vernacular_name)
  AND t.rarity <> pg_temp.map_rarity(t.rarity, p.finders);

UPDATE public.taxa t
SET rarity = pg_temp.map_rarity(t.rarity, 0)
WHERE public.normalize_animal_label(t.vernacular_name) NOT IN (SELECT k FROM _pop)
  AND t.rarity <> pg_temp.map_rarity(t.rarity, 0);

UPDATE public.animals a
SET rarity = pg_temp.map_rarity(a.rarity, p.finders)
FROM _pop p
WHERE p.k = public.normalize_animal_label(a.name)
  AND a.rarity <> pg_temp.map_rarity(a.rarity, p.finders);

UPDATE public.animals a
SET rarity = pg_temp.map_rarity(a.rarity, 0)
WHERE public.normalize_animal_label(a.name) NOT IN (SELECT k FROM _pop)
  AND a.rarity <> pg_temp.map_rarity(a.rarity, 0);

UPDATE public.captures c
SET rarity = pg_temp.map_rarity(c.rarity, p.finders)
FROM _pop p
WHERE p.k = public.normalize_animal_label(c.animal_name)
  AND c.rarity <> pg_temp.map_rarity(c.rarity, p.finders);

UPDATE public.captures c
SET rarity = pg_temp.map_rarity(c.rarity, 0)
WHERE public.normalize_animal_label(c.animal_name) NOT IN (SELECT k FROM _pop)
  AND c.rarity <> pg_temp.map_rarity(c.rarity, 0);

ALTER TABLE public.captures ENABLE TRIGGER USER;
ALTER TABLE public.animals ENABLE TRIGGER USER;
ALTER TABLE public.taxa ENABLE TRIGGER USER;

CREATE OR REPLACE FUNCTION public.xp_on_capture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp integer;
BEGIN
  v_xp := CASE lower(coalesce(NEW.rarity, 'common'))
    WHEN 'common' THEN 50
    WHEN 'uncommon' THEN 75
    WHEN 'rare' THEN 120
    WHEN 'very_rare' THEN 160
    WHEN 'ultra_rare' THEN 220
    WHEN 'illustration_rare' THEN 300
    WHEN 'special_rare' THEN 400
    WHEN 'hyper_rare' THEN 550
    WHEN 'epic' THEN 220
    WHEN 'legendary' THEN 400
    WHEN 'mythic' THEN 550
    ELSE 50
  END;

  PERFORM public.grant_xp(NEW.user_id, v_xp);
  PERFORM public.league_add_points(NEW.user_id, v_xp);
  RETURN NEW;
END;
$$;