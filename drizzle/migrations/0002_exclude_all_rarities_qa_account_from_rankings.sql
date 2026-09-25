DO $$
DECLARE fn regprocedure; definition text;
  old_exclusions text := '''ac0df155-7422-4073-bfc1-14e2a71960bc''';
  new_exclusions text := '''ac0df155-7422-4073-bfc1-14e2a71960bc'',''c62717cb-255a-4491-a5a0-132880e703be''';
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.category_leaderboard(text,integer,text,text)'::regprocedure,
    'public.my_category_rank(text,text,text)'::regprocedure,
    'public.territory_leaderboard(text,integer,text)'::regprocedure,
    'public.my_territory_rank(text,text)'::regprocedure,
    'public.my_species_progress()'::regprocedure
  ] LOOP
    definition := pg_get_functiondef(fn);
    IF position(new_exclusions IN definition) > 0 THEN CONTINUE; END IF;
    IF position(old_exclusions IN definition) = 0 THEN RAISE EXCEPTION 'Missing QA account exclusion in %', fn; END IF;
    EXECUTE replace(definition, old_exclusions, new_exclusions);
  END LOOP;
END;
$$;