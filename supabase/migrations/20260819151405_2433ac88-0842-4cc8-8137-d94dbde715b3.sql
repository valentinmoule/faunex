-- 1. Règles de composition des collections
CREATE TABLE public.collection_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('descendant_of','rank_in','main_category','scientific_prefix','taxon_ids')),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  include boolean NOT NULL DEFAULT true,
  is_core boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX collection_rules_collection_idx ON public.collection_rules(collection_id);

GRANT SELECT ON public.collection_rules TO anon, authenticated;
GRANT ALL ON public.collection_rules TO service_role;

ALTER TABLE public.collection_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection rules are viewable by everyone"
  ON public.collection_rules FOR SELECT USING (true);

CREATE POLICY "Admins manage collection rules"
  ON public.collection_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_collection_rules_updated_at
  BEFORE UPDATE ON public.collection_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Résolution des règles -> taxons
CREATE OR REPLACE FUNCTION public.collection_rule_taxa(p_rule_id uuid)
RETURNS TABLE(taxon_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.collection_rules;
BEGIN
  SELECT * INTO r FROM public.collection_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF r.rule_type = 'descendant_of' THEN
    RETURN QUERY
    WITH RECURSIVE tree AS (
      SELECT t.id FROM public.taxa t
      WHERE t.id = ANY (SELECT (jsonb_array_elements_text(COALESCE(r.params->'taxon_ids','[]'::jsonb)))::uuid)
         OR public.normalize_animal_label(t.vernacular_name) = ANY (
              SELECT public.normalize_animal_label(x)
              FROM jsonb_array_elements_text(COALESCE(r.params->'names','[]'::jsonb)) x
            )
      UNION
      SELECT c.id FROM public.taxa c JOIN tree p ON c.parent_id = p.id
    )
    SELECT t.id FROM public.taxa t
    JOIN tree ON tree.id = t.id
    WHERE t.status <> 'deprecated' AND t.collectible
      AND (r.params->>'include_root' IS NULL OR r.params->>'include_root' = 'true' OR t.rank <> 'group');

  ELSIF r.rule_type = 'rank_in' THEN
    RETURN QUERY
    SELECT t.id FROM public.taxa t
    WHERE t.status <> 'deprecated' AND t.collectible
      AND t.rank::text = ANY (SELECT jsonb_array_elements_text(COALESCE(r.params->'ranks','[]'::jsonb)))
      AND (
        r.params->'main_categories' IS NULL
        OR t.main_category::text = ANY (SELECT jsonb_array_elements_text(r.params->'main_categories'))
      );

  ELSIF r.rule_type = 'main_category' THEN
    RETURN QUERY
    SELECT t.id FROM public.taxa t
    WHERE t.status <> 'deprecated' AND t.collectible
      AND t.main_category::text = ANY (SELECT jsonb_array_elements_text(COALESCE(r.params->'main_categories','[]'::jsonb)));

  ELSIF r.rule_type = 'scientific_prefix' THEN
    RETURN QUERY
    SELECT t.id FROM public.taxa t
    WHERE t.status <> 'deprecated' AND t.collectible
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(COALESCE(r.params->'prefixes','[]'::jsonb)) p
        WHERE lower(COALESCE(t.scientific_name,'')) LIKE lower(p.value) || '%'
      );

  ELSIF r.rule_type = 'taxon_ids' THEN
    RETURN QUERY
    SELECT t.id FROM public.taxa t
    WHERE t.status <> 'deprecated'
      AND t.id = ANY (SELECT (jsonb_array_elements_text(COALESCE(r.params->'taxon_ids','[]'::jsonb)))::uuid);
  END IF;
END;
$$;

-- 3. Recalcul de l'appartenance (non destructif : conserve les liens manuels des collections sans règles)
CREATE OR REPLACE FUNCTION public.refresh_collection_membership(p_collection_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c record;
  v_total integer := 0;
BEGIN
  FOR c IN
    SELECT DISTINCT cr.collection_id
    FROM public.collection_rules cr
    WHERE p_collection_id IS NULL OR cr.collection_id = p_collection_id
  LOOP
    WITH included AS (
      SELECT DISTINCT rt.taxon_id, bool_or(cr.is_core) AS is_core
      FROM public.collection_rules cr
      CROSS JOIN LATERAL public.collection_rule_taxa(cr.id) rt
      WHERE cr.collection_id = c.collection_id AND cr.include
      GROUP BY rt.taxon_id
    ),
    excluded AS (
      SELECT DISTINCT rt.taxon_id
      FROM public.collection_rules cr
      CROSS JOIN LATERAL public.collection_rule_taxa(cr.id) rt
      WHERE cr.collection_id = c.collection_id AND NOT cr.include
    ),
    final AS (
      SELECT i.taxon_id, i.is_core FROM included i
      WHERE NOT EXISTS (SELECT 1 FROM excluded e WHERE e.taxon_id = i.taxon_id)
    ),
    ins AS (
      INSERT INTO public.collection_taxa (collection_id, taxon_id, is_core)
      SELECT c.collection_id, f.taxon_id, f.is_core FROM final f
      ON CONFLICT (collection_id, taxon_id) DO NOTHING
      RETURNING 1
    ),
    del AS (
      DELETE FROM public.collection_taxa ct
      WHERE ct.collection_id = c.collection_id
        AND NOT EXISTS (SELECT 1 FROM final f WHERE f.taxon_id = ct.taxon_id)
      RETURNING 1
    )
    SELECT (SELECT count(*) FROM ins) + (SELECT count(*) FROM del) INTO v_total;
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.collection_rule_taxa(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_collection_membership(uuid) FROM anon, authenticated;

-- 4. Auto-refresh quand le référentiel ou les règles changent
CREATE OR REPLACE FUNCTION public.trg_refresh_collections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'collection_rules' THEN
    PERFORM public.refresh_collection_membership(COALESCE(NEW.collection_id, OLD.collection_id));
  ELSE
    PERFORM public.refresh_collection_membership(NULL);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_collection_rules_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.collection_rules
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_collections();

CREATE TRIGGER trg_taxa_refresh_collections
  AFTER INSERT OR UPDATE OF parent_id, rank, main_category, scientific_name, vernacular_name, collectible, status
  ON public.taxa
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_collections();

-- 5. Progression par collection pour l'utilisateur courant
CREATE OR REPLACE VIEW public.my_collection_progress
WITH (security_invoker = true)
AS
SELECT
  c.id AS collection_id,
  c.slug,
  c.title,
  c.kind,
  c.is_premium,
  c.icon,
  c.sort_order,
  (SELECT count(*) FROM public.collection_taxa ct WHERE ct.collection_id = c.id)::int AS total,
  (SELECT count(DISTINCT cap.taxon_id)
     FROM public.captures cap
     JOIN public.collection_taxa ct2 ON ct2.taxon_id = cap.taxon_id
    WHERE ct2.collection_id = c.id
      AND cap.user_id = auth.uid()
      AND cap.status = 'approved')::int AS owned
FROM public.collections c;

GRANT SELECT ON public.my_collection_progress TO authenticated;

-- 6. Règles des collections spécialisées existantes
INSERT INTO public.collection_rules (collection_id, rule_type, params)
SELECT c.id, v.rule_type, v.params
FROM (VALUES
  ('races-de-chiens',        'descendant_of',     '{"names":["Chien","Chiens"]}'::jsonb),
  ('races-de-chats',         'descendant_of',     '{"names":["Chat","Chats"]}'::jsonb),
  ('races-equines',          'descendant_of',     '{"names":["Cheval","Chevaux"]}'::jsonb),
  ('races-bovines',          'descendant_of',     '{"names":["Vache","Bovins","Bovin"]}'::jsonb),
  ('races-ovines-caprines',  'descendant_of',     '{"names":["Mouton","Moutons","Chèvre","Chèvres","Ovins","Caprins"]}'::jsonb),
  ('races-porcines',         'descendant_of',     '{"names":["Cochon","Porc","Porcins"]}'::jsonb),
  ('races-de-lapins',        'descendant_of',     '{"names":["Lapin","Lapins"]}'::jsonb),
  ('races-de-volailles',     'descendant_of',     '{"names":["Poule","Poules","Volaille","Volailles","Coq"]}'::jsonb),
  ('papillons',              'scientific_prefix', '{"prefixes":[]}'::jsonb),
  ('libellules',             'scientific_prefix', '{"prefixes":[]}'::jsonb),
  ('coccinelles',            'scientific_prefix', '{"prefixes":[]}'::jsonb),
  ('rapaces',                'scientific_prefix', '{"prefixes":[]}'::jsonb),
  ('cervides',               'scientific_prefix', '{"prefixes":[]}'::jsonb)
) AS v(slug, rule_type, params)
JOIN public.collections c ON c.slug = v.slug
WHERE NOT EXISTS (SELECT 1 FROM public.collection_rules cr WHERE cr.collection_id = c.id);

-- Les 5 collections thématiques gardent leur contenu actuel : on fige la liste existante en règle explicite
UPDATE public.collection_rules cr
SET rule_type = 'taxon_ids',
    params = jsonb_build_object('taxon_ids', (
      SELECT COALESCE(jsonb_agg(ct.taxon_id), '[]'::jsonb)
      FROM public.collection_taxa ct WHERE ct.collection_id = cr.collection_id
    ))
WHERE cr.rule_type = 'scientific_prefix' AND cr.params->'prefixes' = '[]'::jsonb;

SELECT public.refresh_collection_membership(NULL);