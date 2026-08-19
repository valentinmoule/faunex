-- Phase 7 : snapshots ciblés
CREATE TABLE public.taxa_phase7_backup_20260819 AS
  SELECT * FROM public.taxa WHERE main_category = 'Mollusques';

CREATE TABLE public.animals_phase7_backup_20260819 AS
  SELECT a.* FROM public.animals a
  WHERE a.taxon_id IN (SELECT id FROM public.taxa WHERE main_category = 'Mollusques')
     OR a.category = 'Mollusques';

CREATE TABLE public.collection_taxa_phase7_backup_20260819 AS
  SELECT ct.* FROM public.collection_taxa ct
  WHERE ct.taxon_id IN (SELECT id FROM public.taxa WHERE main_category = 'Mollusques');

CREATE TABLE public.captures_phase7_backup_20260819 AS
  SELECT c.id, c.user_id, c.taxon_id, c.category, c.animal_name, c.rarity, now() AS snapshot_at
  FROM public.captures c
  WHERE c.taxon_id IN (SELECT id FROM public.taxa WHERE main_category = 'Mollusques');

GRANT ALL ON public.taxa_phase7_backup_20260819 TO service_role;
GRANT ALL ON public.animals_phase7_backup_20260819 TO service_role;
GRANT ALL ON public.collection_taxa_phase7_backup_20260819 TO service_role;
GRANT ALL ON public.captures_phase7_backup_20260819 TO service_role;

ALTER TABLE public.taxa_phase7_backup_20260819 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals_phase7_backup_20260819 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_taxa_phase7_backup_20260819 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captures_phase7_backup_20260819 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read taxa phase7 backup" ON public.taxa_phase7_backup_20260819
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read animals phase7 backup" ON public.animals_phase7_backup_20260819
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read collection_taxa phase7 backup" ON public.collection_taxa_phase7_backup_20260819
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read captures phase7 backup" ON public.captures_phase7_backup_20260819
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- La normalisation de catégorie doit désormais laisser passer les nouvelles catégories
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
    WHEN c IN ('autres invertébrés','autres invertebres','autre invertébré','autre invertebre') THEN 'Autres invertébrés'
    WHEN c IN ('autre (non animal)','autre non animal') THEN 'Autre (non animal)'
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