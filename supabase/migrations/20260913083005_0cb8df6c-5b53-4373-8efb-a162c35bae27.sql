CREATE OR REPLACE FUNCTION public.block_placeholder_names()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  j jsonb := to_jsonb(NEW);
  common_name text;
  sci_name text;
  bad text[] := ARRAY['inconnu','inconnue','unknown','??','?','n/a','na','none','null','-'];
BEGIN
  common_name := COALESCE(j->>'animal_name', j->>'name', j->>'vernacular_name');
  sci_name := j->>'scientific_name';

  IF common_name IS NOT NULL AND (
       btrim(common_name) = '' OR lower(btrim(common_name)) = ANY (bad)
       OR lower(common_name) LIKE '%je ne sais pas%'
     ) THEN
    RAISE EXCEPTION 'Nom commun invalide (%) : un nom d''espèce explicite est requis.', common_name;
  END IF;

  IF sci_name IS NOT NULL AND (
       lower(btrim(sci_name)) = ANY (bad) OR lower(sci_name) LIKE '%inconnu%' OR lower(sci_name) LIKE '%unknown%'
       OR lower(sci_name) LIKE '%je ne sais pas%'
     ) THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('scientific_name', NULL));
  END IF;

  RETURN NEW;
END;
$function$