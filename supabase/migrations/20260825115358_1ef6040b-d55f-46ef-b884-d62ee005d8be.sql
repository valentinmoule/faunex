SET LOCAL statement_timeout = '240s';

-- ===== Territoires (départements) =====
DELETE FROM public.animal_departments ad
USING (
  SELECT department_code, animal_name FROM (
    SELECT department_code, animal_name,
           row_number() OVER (
             PARTITION BY department_code,
               lower(btrim(coalesce(public.strip_label_parenthetical(animal_name), animal_name)))
             ORDER BY (animal_name NOT LIKE '%(%') DESC, animal_name ASC
           ) rn
    FROM public.animal_departments
  ) x WHERE rn > 1
) d
WHERE ad.department_code = d.department_code AND ad.animal_name = d.animal_name;

UPDATE public.animal_departments ad
SET animal_name = public.strip_label_parenthetical(ad.animal_name)
WHERE ad.animal_name LIKE '%(%'
  AND public.strip_label_parenthetical(ad.animal_name) IS NOT NULL;

-- ===== Taxonomie =====
DO $$
DECLARE r record; v_target uuid; v_clean text;
BEGIN
  FOR r IN
    SELECT id, vernacular_name, rank FROM public.taxa
    WHERE vernacular_name LIKE '%(%' ORDER BY created_at
  LOOP
    v_clean := public.strip_label_parenthetical(r.vernacular_name);
    IF v_clean IS NULL OR v_clean = r.vernacular_name THEN CONTINUE; END IF;

    SELECT b.id INTO v_target
    FROM public.taxa b
    WHERE b.rank = r.rank AND b.id <> r.id
      AND public.normalize_animal_label(b.vernacular_name) = public.normalize_animal_label(v_clean)
    ORDER BY b.created_at ASC LIMIT 1;

    IF v_target IS NULL THEN
      UPDATE public.taxa SET vernacular_name = v_clean, updated_at = now() WHERE id = r.id;
      v_target := r.id;
    ELSE
      UPDATE public.captures SET taxon_id = v_target WHERE taxon_id = r.id;
      UPDATE public.animals SET taxon_id = v_target WHERE taxon_id = r.id;
      UPDATE public.animal_departments SET taxon_id = v_target WHERE taxon_id = r.id;
      UPDATE public.ml_dataset_events SET taxon_id = v_target WHERE taxon_id = r.id;
      UPDATE public.taxa SET parent_id = v_target WHERE parent_id = r.id;
      UPDATE public.taxa SET merged_into = v_target WHERE merged_into = r.id;
      UPDATE public.taxa SET progress_taxon_id = v_target WHERE progress_taxon_id = r.id;
      UPDATE public.taxon_synonyms SET taxon_id = v_target WHERE taxon_id = r.id;
      DELETE FROM public.collection_taxa ct WHERE ct.taxon_id = r.id
        AND EXISTS (SELECT 1 FROM public.collection_taxa ct2
                    WHERE ct2.taxon_id = v_target AND ct2.collection_id = ct.collection_id);
      UPDATE public.collection_taxa SET taxon_id = v_target WHERE taxon_id = r.id;
      DELETE FROM public.taxa WHERE id = r.id;
    END IF;

    INSERT INTO public.taxon_synonyms (taxon_id, label, normalized_label, kind, lang)
    VALUES (v_target, r.vernacular_name, public.normalize_animal_label(r.vernacular_name), 'vernacular', 'fr')
    ON CONFLICT (normalized_label) DO NOTHING;
  END LOOP;
END $$;