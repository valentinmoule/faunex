-- 1. Lien race -> espèce générique de progression
ALTER TABLE public.taxa ADD COLUMN IF NOT EXISTS progress_taxon_id uuid REFERENCES public.taxa(id);

-- 2. Les enfants de ces groupes sont de vraies espèces, pas des races
UPDATE public.taxa c SET rank = 'species'
FROM public.taxa g
WHERE c.parent_id = g.id
  AND g.rank = 'group'
  AND c.rank = 'breed'
  AND g.vernacular_name IN ('Camélidés domestiques','Oiseaux de cage','Poissons d''ornement','Rongeurs de compagnie');

-- 3. Promotion des représentants génériques en espèce
WITH reps(grp, rep) AS (
  VALUES
    ('Chats','Chat domestique'),
    ('Chiens','Chien domestique'),
    ('Bovins','Vache'),
    ('Chevaux','Cheval'),
    ('Ovins','Mouton'),
    ('Caprins','Chèvre'),
    ('Porcins','Cochon'),
    ('Ânes','Âne'),
    ('Volailles','Poule domestique'),
    ('Canards domestiques','Canard domestique'),
    ('Oies domestiques','Oie domestique'),
    ('Dindons','Dinde'),
    ('Pigeons domestiques','Pigeon domestique'),
    ('Lapins domestiques','Lapin domestique')
)
UPDATE public.taxa c
SET rank = 'species', collectible = true, progress_taxon_id = NULL
FROM public.taxa g, reps r
WHERE c.parent_id = g.id AND g.rank = 'group'
  AND g.vernacular_name = r.grp AND c.vernacular_name = r.rep;

-- 4. Les races pointent vers l'espèce générique de leur groupe
UPDATE public.taxa b
SET progress_taxon_id = s.id
FROM public.taxa g
JOIN public.taxa s ON s.parent_id = g.id AND s.rank = 'species'
WHERE b.parent_id = g.id
  AND b.rank = 'breed'
  AND g.rank = 'group'
  AND s.id <> b.id;

-- 5. Fonction utilitaire
CREATE OR REPLACE FUNCTION public.progress_taxon(p_taxon_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(t.progress_taxon_id, t.id) FROM public.taxa t WHERE t.id = p_taxon_id
$$;

-- 6. Les collections de catégorie principale ne contiennent plus les races,
--    mais l'espèce générique correspondante.
INSERT INTO public.collection_taxa (collection_id, taxon_id, is_core)
SELECT DISTINCT ct.collection_id, t.progress_taxon_id, true
FROM public.collection_taxa ct
JOIN public.collections c ON c.id = ct.collection_id AND c.kind = 'main_category'
JOIN public.taxa t ON t.id = ct.taxon_id
WHERE t.progress_taxon_id IS NOT NULL
ON CONFLICT (collection_id, taxon_id) DO NOTHING;

DELETE FROM public.collection_taxa ct
USING public.collections c, public.taxa t
WHERE c.id = ct.collection_id AND c.kind = 'main_category'
  AND t.id = ct.taxon_id AND t.progress_taxon_id IS NOT NULL;

-- 7. Progression : une capture de race valide la race ET l'espèce générique
CREATE OR REPLACE VIEW public.my_collection_progress
WITH (security_invoker = true) AS
SELECT c.id AS collection_id,
  c.slug, c.title, c.kind, c.is_premium, c.icon, c.sort_order,
  ((SELECT count(*) FROM public.collection_taxa ct WHERE ct.collection_id = c.id))::integer AS total,
  ((SELECT count(DISTINCT ct2.taxon_id)
      FROM public.captures cap
      JOIN public.taxa tx ON tx.id = cap.taxon_id
      JOIN public.collection_taxa ct2
        ON ct2.taxon_id = tx.id OR ct2.taxon_id = tx.progress_taxon_id
     WHERE ct2.collection_id = c.id
       AND cap.user_id = auth.uid()
       AND cap.status = 'approved'))::integer AS owned
FROM public.collections c;

-- 8. Catalogue exposé au bestiaire : races marquées et rattachées à leur espèce
CREATE OR REPLACE VIEW public.bestiary_catalogue
WITH (security_invoker = true) AS
SELECT a.name,
       a.scientific_name,
       a.rarity,
       a.category,
       a.taxon_id,
       (t.progress_taxon_id IS NOT NULL) AS is_breed,
       COALESCE(
         (SELECT a2.name FROM public.animals a2 WHERE a2.taxon_id = t.progress_taxon_id ORDER BY a2.name LIMIT 1),
         (SELECT s.vernacular_name FROM public.taxa s WHERE s.id = t.progress_taxon_id),
         a.name
       ) AS progress_name
FROM public.animals a
LEFT JOIN public.taxa t ON t.id = a.taxon_id;

GRANT SELECT ON public.bestiary_catalogue TO authenticated;
GRANT SELECT ON public.my_collection_progress TO authenticated;
