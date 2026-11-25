CREATE INDEX IF NOT EXISTS captures_first_species_approved_idx ON public.captures (user_id, lower(btrim(animal_name)), created_at, id) WHERE status = 'approved';

DO $migration$
DECLARE
  fn regprocedure;
  definition text;
  first_species text := $filter$c.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.captures earlier
        WHERE earlier.user_id = c.user_id AND earlier.status = 'approved'
          AND lower(btrim(earlier.animal_name)) = lower(btrim(c.animal_name))
          AND (earlier.created_at, earlier.id) < (c.created_at, c.id)
      )$filter$;
BEGIN
  -- Keep deployed signatures, privacy, scope, exclusions and week boundaries intact.
  FOREACH fn IN ARRAY ARRAY[
    'public.category_leaderboard(text,integer,text,text)'::regprocedure,
    'public.my_category_rank(text,text,text)'::regprocedure,
    'public.category_leaderboard_with_movement(text,integer,text,text)'::regprocedure,
    'public.my_category_rank_with_movement(text,text,text)'::regprocedure,
    'public.territory_leaderboard(text,integer,text)'::regprocedure,
    'public.my_territory_rank(text,text)'::regprocedure,
    'public.xp_leaderboard_v2(integer,text,text)'::regprocedure,
    'public.league_board()'::regprocedure
  ] LOOP
    definition := pg_get_functiondef(fn);
    IF strpos(definition, $match$c.status = 'approved'$match$) = 0 THEN
      RAISE EXCEPTION 'Missing capture filter in %', fn;
    END IF;
    EXECUTE replace(definition, $match$c.status = 'approved'$match$, first_species);
  END LOOP;

  definition := pg_get_functiondef('public.xp_on_capture()'::regprocedure);
  IF strpos(definition, 'v_xp := 15;') = 0 THEN
    RAISE EXCEPTION 'Unexpected capture XP rule';
  END IF;
  definition := replace(definition, 'v_xp := 15;', 'v_xp := 0;');
  definition := replace(definition,
    E'  IF EXISTS (\n    SELECT 1 FROM public.captures c',
    E'  PERFORM pg_advisory_xact_lock(hashtextextended(''capture-xp:'' || NEW.user_id::text, 0));\n  IF EXISTS (\n    SELECT 1 FROM public.captures c');
  definition := replace(definition,
    '  PERFORM public.grant_xp(NEW.user_id, v_xp);',
    '  IF v_xp > 0 THEN PERFORM public.grant_xp(NEW.user_id, v_xp); END IF;');
  EXECUTE definition;
END;
$migration$;