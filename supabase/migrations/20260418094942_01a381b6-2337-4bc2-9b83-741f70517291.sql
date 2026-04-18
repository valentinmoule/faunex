-- Fix the default xp_to_next so new profiles need only 50 XP to hit level 1
ALTER TABLE public.profiles ALTER COLUMN xp_to_next SET DEFAULT 50;

-- Update handle_new_user to explicitly set the correct starting threshold
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username, level, xp, xp_to_next)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    '@' || split_part(NEW.email, '@', 1),
    0,
    0,
    50
  );
  RETURN NEW;
END;
$function$;