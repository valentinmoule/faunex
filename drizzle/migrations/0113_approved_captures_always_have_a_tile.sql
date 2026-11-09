-- An approved capture must always fill an existing Bestiary tile; otherwise it is
-- invisible in Mon Faunex while still counting as "already owned".

CREATE OR REPLACE FUNCTION public.capture_tile_for(p_name text, p_scientific text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v text; mapped text; own_key text := public.binomial_key(p_scientific);
BEGIN
 IF coalesce(btrim(p_name),'') = '' THEN RETURN NULL; END IF;
 SELECT a.name INTO v FROM public.animals a WHERE lower(btrim(a.name)) = lower(btrim(p_name)) LIMIT 1;
 IF v IS NOT NULL THEN RETURN v; END IF;
 -- Same label up to accents/punctuation, never across two distinct binomials.
 SELECT a.name INTO v FROM public.animals a
  WHERE public.normalize_animal_label(a.name) = public.normalize_animal_label(p_name)
    AND (own_key IS NULL OR public.binomial_key(a.scientific_name) IS NULL OR public.binomial_key(a.scientific_name) = own_key)
  ORDER BY a.created_at LIMIT 1;
 IF v IS NOT NULL THEN RETURN v; END IF;
 -- Former names kept by merges/renames.
 mapped := public.canonical_animal_name(p_name);
 IF mapped IS NOT NULL AND lower(mapped) <> lower(p_name) THEN
  SELECT a.name INTO v FROM public.animals a
   WHERE lower(btrim(a.name)) = lower(btrim(mapped))
     AND (own_key IS NULL OR public.binomial_key(a.scientific_name) IS NULL OR public.binomial_key(a.scientific_name) = own_key)
   LIMIT 1;
  IF v IS NOT NULL THEN RETURN v; END IF;
 END IF;
 -- A species binomial pointing to exactly one tile.
 IF own_key IS NOT NULL AND btrim(p_scientific) ~ '^[A-Z][a-z]+ [a-z-]+$' THEN
  SELECT min(a.name) INTO v FROM public.animals a
   WHERE lower(btrim(a.scientific_name)) = lower(btrim(p_scientific))
   HAVING count(*) = 1;
 END IF;
 RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.capture_tile_for(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_tile_for(text, text) TO service_role;

-- BEFORE trigger: snap an approved capture onto its existing tile.
CREATE OR REPLACE FUNCTION public.snap_capture_to_tile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v text; v_rarity text;
BEGIN
 IF NEW.status IS DISTINCT FROM 'approved' OR coalesce(btrim(NEW.animal_name),'') = '' OR lower(btrim(NEW.animal_name)) = 'inconnu' THEN
  RETURN NEW;
 END IF;
 IF EXISTS (SELECT 1 FROM public.animals a WHERE lower(btrim(a.name)) = lower(btrim(NEW.animal_name))) THEN
  RETURN NEW;
 END IF;
 v := public.capture_tile_for(NEW.animal_name, NEW.scientific_name);
 IF v IS NOT NULL THEN
  NEW.animal_name := v;
  SELECT a.rarity INTO v_rarity FROM public.animals a WHERE a.name = v LIMIT 1;
  IF v_rarity IS NOT NULL THEN NEW.rarity := v_rarity; END IF;
 END IF;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zz_zz_snap_capture_to_tile ON public.captures;
CREATE TRIGGER zz_zz_snap_capture_to_tile
 BEFORE INSERT OR UPDATE OF animal_name, scientific_name, status ON public.captures
 FOR EACH ROW EXECUTE FUNCTION public.snap_capture_to_tile();

-- AFTER trigger: create the tile; when the new-species guard silently skips the
-- insert because the name resolves to an existing tile, move the capture there.
CREATE OR REPLACE FUNCTION public.sync_animal_on_capture_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v text;
BEGIN
  IF NEW.status = 'approved'
     AND NEW.animal_name IS NOT NULL
     AND NEW.animal_name <> ''
     AND LOWER(NEW.animal_name) <> 'inconnu'
     AND COALESCE(NEW.category, '') <> 'N/A'
     -- Existing tiles need no insert attempt; skipping avoids the costly new-species guard on bulk renames.
     AND NOT EXISTS (SELECT 1 FROM public.animals a WHERE lower(a.name) = lower(NEW.animal_name)) THEN
    INSERT INTO public.animals (name, scientific_name, category, rarity, iucn_status)
    VALUES (NEW.animal_name, NEW.scientific_name,
      public.canonical_animal_category(NEW.category, NEW.animal_name, NEW.scientific_name),
      NEW.rarity, NEW.iucn_status)
    ON CONFLICT (LOWER(name)) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM public.animals a WHERE lower(a.name) = lower(NEW.animal_name)) THEN
      v := public.capture_tile_for(NEW.animal_name, NEW.scientific_name);
      IF v IS NULL THEN
        BEGIN
          SELECT r.name INTO v FROM public.resolve_species_identity(NEW.animal_name, NEW.scientific_name) r WHERE r.matched;
        EXCEPTION WHEN raise_exception THEN v := NULL;
        END;
        IF v IS NOT NULL THEN
          SELECT a.name INTO v FROM public.animals a WHERE public.normalize_animal_label(a.name) = public.normalize_animal_label(v) LIMIT 1;
        END IF;
      END IF;
      IF v IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.captures c WHERE c.user_id = NEW.user_id AND c.status = 'approved' AND c.id <> NEW.id AND lower(btrim(c.animal_name)) = lower(btrim(v))
      ) THEN
        UPDATE public.captures SET animal_name = v WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Renaming a tile carries its captures along, so they never lose their tile.
CREATE OR REPLACE FUNCTION public.cascade_tile_rename_to_captures()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
 IF lower(btrim(NEW.name)) IS NOT DISTINCT FROM lower(btrim(OLD.name)) THEN RETURN NEW; END IF;
 IF EXISTS (SELECT 1 FROM public.animals a WHERE lower(btrim(a.name)) = lower(btrim(OLD.name))) THEN RETURN NEW; END IF;
 UPDATE public.captures c SET animal_name = NEW.name
  WHERE c.status = 'approved'
    AND lower(btrim(c.animal_name)) = lower(btrim(OLD.name))
    AND NOT EXISTS (SELECT 1 FROM public.captures d WHERE d.user_id = c.user_id AND d.status = 'approved' AND lower(btrim(d.animal_name)) = lower(btrim(NEW.name)));
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zz_cascade_tile_rename_to_captures ON public.animals;
CREATE TRIGGER zz_cascade_tile_rename_to_captures
 AFTER UPDATE OF name ON public.animals
 FOR EACH ROW EXECUTE FUNCTION public.cascade_tile_rename_to_captures();

-- Deleting a tile: captures move to another tile of the same animal when one
-- exists (keeping the explorer's most recent photo); otherwise they are released
-- with the tile, after a snapshot, instead of staying invisible but "owned".
CREATE OR REPLACE FUNCTION public.admin_delete_bestiary_species_impl(p_name text, p_scientific text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_animal public.animals%ROWTYPE; v_batch text; r record; v_target text;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_animal FROM public.animals
  WHERE name = p_name AND coalesce(scientific_name, '') = coalesce(p_scientific, '')
  FOR UPDATE;
  IF v_animal.id IS NULL THEN RETURN false; END IF;

  v_batch := 'tile-delete:' || gen_random_uuid()::text;
  INSERT INTO public.catalogue_update_snapshots(batch_key, relation_name, row_key, row_data)
   SELECT v_batch, 'animals', v_animal.id::text, to_jsonb(v_animal);
  INSERT INTO public.catalogue_update_snapshots(batch_key, relation_name, row_key, row_data)
   SELECT v_batch, 'captures', c.id::text, to_jsonb(c) FROM public.captures c
   WHERE lower(btrim(c.animal_name)) = lower(btrim(v_animal.name)) AND c.status IN ('approved','pending_review');

  UPDATE public.species_pages SET published = false WHERE animal_name = v_animal.name;
  DELETE FROM public.animals WHERE id = v_animal.id;

  FOR r IN SELECT c.id, c.user_id, c.animal_name, c.scientific_name, c.created_at FROM public.captures c
           WHERE lower(btrim(c.animal_name)) = lower(btrim(v_animal.name)) AND c.status = 'approved'
  LOOP
    v_target := public.capture_tile_for(r.animal_name, r.scientific_name);
    IF v_target IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.captures d WHERE d.user_id = r.user_id AND d.status = 'approved' AND d.id <> r.id
                 AND lower(btrim(d.animal_name)) = lower(btrim(v_target)) AND d.created_at >= r.created_at) THEN
        UPDATE public.captures SET status = 'rejected' WHERE id = r.id;
      ELSE
        UPDATE public.captures SET status = 'rejected'
         WHERE user_id = r.user_id AND status = 'approved' AND id <> r.id AND lower(btrim(animal_name)) = lower(btrim(v_target));
        UPDATE public.captures SET animal_name = v_target WHERE id = r.id;
      END IF;
    ELSE
      DELETE FROM public.captures WHERE id = r.id;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;