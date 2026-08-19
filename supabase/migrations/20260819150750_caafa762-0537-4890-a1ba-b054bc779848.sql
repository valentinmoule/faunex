-- 1. Reclasser les données existantes
UPDATE public.taxa SET main_category = 'Autres invertébrés' WHERE main_category = 'Autre (non animal)';
UPDATE public.animals SET category = 'Autres invertébrés' WHERE category = 'Autre (non animal)';
UPDATE public.captures SET category = 'Autres invertébrés' WHERE category = 'Autre (non animal)';

-- 2. Retirer la valeur de l'enum
DROP FUNCTION IF EXISTS public.match_taxon(text, text);

CREATE TYPE public.main_category_new AS ENUM (
  'Mammifères','Oiseaux','Reptiles','Amphibiens','Poissons','Insectes',
  'Arachnides','Crustacés','Mollusques','Échinodermes','Cnidaires','Autres invertébrés'
);

ALTER TABLE public.taxa
  ALTER COLUMN main_category TYPE public.main_category_new
  USING main_category::text::public.main_category_new;

ALTER TABLE public.taxa_phase7_backup_20260819
  ALTER COLUMN main_category TYPE public.main_category_new
  USING main_category::text::public.main_category_new;

DROP TYPE public.main_category;
ALTER TYPE public.main_category_new RENAME TO main_category;

-- 3. Recréer match_taxon (dépend du type)
CREATE OR REPLACE FUNCTION public.match_taxon(p_name text, p_scientific text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, vernacular_name text, scientific_name text, rank taxon_rank, main_category main_category, rarity text, collectible boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cfg AS (
    SELECT public.normalize_animal_label(p_name) AS n_name,
           public.normalize_animal_label(p_scientific) AS n_sci
  ),
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
$function$;

-- 4. La normalisation ne peut plus produire "Autre (non animal)"
CREATE OR REPLACE FUNCTION public.canonical_animal_category(p_category text, p_name text DEFAULT NULL::text, p_scientific text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  c text := lower(coalesce(p_category, ''));
  base text;
  world boolean := c LIKE '%(monde)%';
  hay text := lower(coalesce(p_category,'') || ' ' || coalesce(p_name,'') || ' ' || coalesce(p_scientific,''));
BEGIN
  c := btrim(replace(c, '(monde)', ''));

  base := CASE
    WHEN c IN ('mammifères','mammiferes','mammifère','mammal','mammals') THEN 'Mammifères'
    WHEN c IN ('oiseaux','oiseau','bird','birds') THEN 'Oiseaux'
    WHEN c IN ('reptiles','reptile') THEN 'Reptiles'
    WHEN c IN ('amphibiens','amphibien') THEN 'Amphibiens'
    WHEN c IN ('poissons','poisson','vie marine') THEN 'Poissons'
    WHEN c IN ('insectes','insecte') THEN 'Insectes'
    WHEN c IN ('arachnides','arachnide') THEN 'Arachnides'
    WHEN c IN ('crustacés','crustaces','crustacé') THEN 'Crustacés'
    WHEN c IN ('mollusques','mollusque') THEN 'Mollusques'
    WHEN c IN ('échinodermes','echinodermes','échinoderme','echinoderme') THEN 'Échinodermes'
    WHEN c IN ('cnidaires','cnidaire') THEN 'Cnidaires'
    WHEN c IN ('autres invertébrés','autres invertebres','autre invertébré','autre invertebre',
               'autre (non animal)','autre non animal','autre','autres','other') THEN 'Autres invertébrés'
    ELSE NULL
  END;

  IF base IS NULL THEN
    base := CASE
      WHEN hay ~ '(araign|scorpion|acarien|tique|opilion|arachn)' THEN 'Arachnides'
      WHEN hay ~ '(oiseau|pinson|mésange|mesange|moineau|aigle|canard|passer|fring|corvus|bird)' THEN 'Oiseaux'
      WHEN hay ~ '(serpent|lézard|lezard|gecko|tortue|iguane|couleuvre|vipère|vipere|reptil)' THEN 'Reptiles'
      WHEN hay ~ '(grenouille|crapaud|triton|salamandre|amphib|rana|bufo)' THEN 'Amphibiens'
      WHEN hay ~ '(poisson|truite|carpe|requin|raie|anguille|bar |dorade|fish)' THEN 'Poissons'
      WHEN hay ~ '(crabe|crevette|homard|langoustine|cloporte|balane|crustac)' THEN 'Crustacés'
      WHEN hay ~ '(escargot|limace|moule|huître|huitre|poulpe|calmar|seiche|mollusq|ver |vers |annélide|annelide|étoile de mer|etoile de mer|oursin|anémone|anemone|méduse|meduse)' THEN 'Mollusques'
      WHEN hay ~ '(insecte|papillon|abeille|guêpe|guepe|coléoptère|coleoptere|coccinelle|fourmi|libellule|mouche|moustique|sauterelle|criquet|punaise|cigale|frelon|mille-pattes|myriapode|scolopendre)' THEN 'Insectes'
      WHEN hay ~ '(mammif|chien|chat|cheval|vache|renard|écureuil|ecureuil|chauve-souris|dauphin|baleine|canis|felis|cervi)' THEN 'Mammifères'
      ELSE 'Mammifères'
    END;
  END IF;

  IF world THEN
    RETURN base || ' (monde)';
  END IF;
  RETURN base;
END;
$function$;