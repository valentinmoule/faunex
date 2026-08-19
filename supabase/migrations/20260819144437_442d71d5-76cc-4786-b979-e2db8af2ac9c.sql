-- 5a. Recherche dans le référentiel (noms + synonymes)
CREATE OR REPLACE FUNCTION public.match_taxon(p_name text, p_scientific text DEFAULT NULL::text)
RETURNS TABLE(id uuid, vernacular_name text, scientific_name text, rank public.taxon_rank,
              main_category public.main_category, rarity text, collectible boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cfg AS (
    SELECT public.normalize_animal_label(p_name) AS n_name,
           public.normalize_animal_label(p_scientific) AS n_sci
  ),
  -- Un binôme partagé par plusieurs races (ou porté par un groupe) ne peut pas
  -- servir de clé d'identification : déduit du référentiel, plus de liste figée.
  amb AS (
    SELECT EXISTS (
      SELECT 1 FROM public.taxa t, cfg
      WHERE t.scientific_name IS NOT NULL
        AND public.normalize_animal_label(t.scientific_name) = cfg.n_sci
        AND (t.is_domestic OR t.rank = 'group')
    ) AS sci_ambiguous
  )
  SELECT t.id, t.vernacular_name, t.scientific_name, t.rank, t.main_category, t.rarity, t.collectible
  FROM public.taxa t, cfg, amb
  WHERE t.status <> 'deprecated'
    AND (
      public.normalize_animal_label(t.vernacular_name) = cfg.n_name
      OR EXISTS (
        SELECT 1 FROM public.taxon_synonyms s
        WHERE s.taxon_id = t.id AND s.normalized_label = cfg.n_name
      )
      OR (
        NOT amb.sci_ambiguous
        AND p_scientific IS NOT NULL
        AND t.scientific_name IS NOT NULL
        AND public.normalize_animal_label(t.scientific_name) = cfg.n_sci
      )
    )
  ORDER BY (public.normalize_animal_label(t.vernacular_name) = cfg.n_name) DESC,
           (t.rank = 'group') ASC,
           t.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.match_taxon(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_taxon(text, text) TO authenticated, service_role;

-- 5b. match_animal : ambiguïté déduite du référentiel au lieu de la liste codée en dur
CREATE OR REPLACE FUNCTION public.match_animal(p_name text, p_scientific text DEFAULT NULL::text)
RETURNS TABLE(id uuid, name text, scientific_name text, category text, rarity text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH cfg AS (
    SELECT btrim(public.normalize_animal_label(p_name)) AS n_name,
           btrim(public.normalize_animal_label(p_scientific)) AS n_sci
  ),
  amb AS (
    SELECT (
      EXISTS (
        SELECT 1 FROM public.taxa t, cfg
        WHERE t.scientific_name IS NOT NULL
          AND public.normalize_animal_label(t.scientific_name) = cfg.n_sci
          AND (t.is_domestic OR t.rank = 'group')
      )
      OR (
        SELECT count(*) > 1 FROM public.animals a, cfg
        WHERE a.scientific_name IS NOT NULL
          AND btrim(public.normalize_animal_label(a.scientific_name)) = cfg.n_sci
      )
    ) AS sci_ambiguous
  )
  SELECT a.id, a.name, a.scientific_name, a.category, a.rarity
  FROM public.animals a, cfg, amb
  WHERE btrim(public.normalize_animal_label(a.name)) = cfg.n_name
     OR (
        NOT amb.sci_ambiguous
        AND p_scientific IS NOT NULL
        AND a.scientific_name IS NOT NULL
        AND btrim(public.normalize_animal_label(a.scientific_name)) = cfg.n_sci
     )
  ORDER BY (btrim(public.normalize_animal_label(a.name)) = cfg.n_name) DESC,
           a.created_at ASC
  LIMIT 1;
$$;

-- 5c. Alimentation automatique du lien référentiel sur les nouvelles données
CREATE OR REPLACE FUNCTION public.link_capture_taxon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.taxon_id IS NULL AND coalesce(NEW.animal_name, '') <> '' THEN
    SELECT m.id INTO NEW.taxon_id
    FROM public.match_taxon(NEW.animal_name, NEW.scientific_name) m;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_link_capture_taxon
  BEFORE INSERT OR UPDATE OF animal_name, scientific_name ON public.captures
  FOR EACH ROW EXECUTE FUNCTION public.link_capture_taxon();

CREATE OR REPLACE FUNCTION public.ml_dataset_link_animal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.animal_id IS NULL THEN
    SELECT m.id INTO NEW.animal_id
    FROM public.match_animal(
      COALESCE(NEW.label_name, NEW.predicted_name),
      COALESCE(NEW.label_scientific_name, NEW.predicted_scientific_name)
    ) m;
  END IF;
  IF NEW.taxon_id IS NULL THEN
    IF NEW.animal_id IS NOT NULL THEN
      SELECT a.taxon_id INTO NEW.taxon_id FROM public.animals a WHERE a.id = NEW.animal_id;
    END IF;
    IF NEW.taxon_id IS NULL THEN
      SELECT m.id INTO NEW.taxon_id
      FROM public.match_taxon(
        COALESCE(NEW.label_name, NEW.predicted_name),
        COALESCE(NEW.label_scientific_name, NEW.predicted_scientific_name)
      ) m;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;