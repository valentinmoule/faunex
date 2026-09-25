-- Keep the all-rarities QA account out of public rankings, like the existing QA accounts.
-- Replace the existing exclusion list in the live functions without changing their signatures or grants.
do $$
declare
  fn regprocedure;
  definition text;
  old_exclusions text := '''ac0df155-7422-4073-bfc1-14e2a71960bc''';
  new_exclusions text := '''ac0df155-7422-4073-bfc1-14e2a71960bc'',''c62717cb-255a-4491-a5a0-132880e703be''';
begin
  foreach fn in array array[
    'public.category_leaderboard(text,integer,text,text)'::regprocedure,
    'public.my_category_rank(text,text,text)'::regprocedure,
    'public.territory_leaderboard(text,integer,text)'::regprocedure,
    'public.my_territory_rank(text,text)'::regprocedure,
    'public.my_species_progress()'::regprocedure
  ] loop
    definition := pg_get_functiondef(fn);
    if position(new_exclusions in definition) > 0 then
      continue;
    end if;
    if position(old_exclusions in definition) = 0 then
      raise exception 'Missing previous test-account exclusion in %', fn;
    end if;
    execute replace(definition, old_exclusions, new_exclusions);
  end loop;
end;
$$;
