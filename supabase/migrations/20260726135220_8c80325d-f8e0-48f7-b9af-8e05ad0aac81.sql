CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
BEGIN
  v_base := lower(regexp_replace(split_part(COALESCE(NEW.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  IF v_base IS NULL OR length(v_base) < 3 THEN
    v_base := 'explorateur';
  END IF;
  v_base := left(v_base, 20);

  v_candidate := '@' || v_base;
  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = v_candidate) LOOP
    v_suffix := v_suffix + 1;
    IF v_suffix > 50 THEN
      v_candidate := '@' || v_base || floor(random() * 1000000)::text;
    ELSE
      v_candidate := '@' || v_base || v_suffix::text;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (user_id, display_name, username, level, xp, xp_to_next)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
      split_part(COALESCE(NEW.email, 'Explorateur'), '@', 1)
    ),
    v_candidate,
    0,
    0,
    50
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;