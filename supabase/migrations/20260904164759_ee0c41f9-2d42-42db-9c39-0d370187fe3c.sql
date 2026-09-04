CREATE OR REPLACE FUNCTION public.block_human_species()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_sci text;
  v_row jsonb := to_jsonb(NEW);
BEGIN
  IF TG_TABLE_NAME = 'animals' THEN
    v_name := lower(coalesce(v_row->>'name', ''));
  ELSIF TG_TABLE_NAME = 'taxa' THEN
    v_name := lower(coalesce(v_row->>'vernacular_name', ''));
  ELSE
    v_name := lower(coalesce(v_row->>'animal_name', ''));
  END IF;
  v_sci := lower(coalesce(v_row->>'scientific_name', ''));

  IF v_sci LIKE 'homo sapiens%'
     OR v_name IN ('humain', 'être humain', 'etre humain', 'homme', 'human', 'human being', 'person', 'personne')
  THEN
    RAISE EXCEPTION 'Les êtres humains ne peuvent pas être enregistrés comme espèce.';
  END IF;

  RETURN NEW;
END;
$$;