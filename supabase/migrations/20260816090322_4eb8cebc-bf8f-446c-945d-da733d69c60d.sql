CREATE OR REPLACE FUNCTION public.canonical_animal_category(p_category text, p_name text DEFAULT NULL, p_scientific text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.enforce_animal_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.category := public.canonical_animal_category(NEW.category, NEW.name, NEW.scientific_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_animal_category_trg ON public.animals;
CREATE TRIGGER enforce_animal_category_trg
  BEFORE INSERT OR UPDATE OF category, name, scientific_name ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_animal_category();

CREATE OR REPLACE FUNCTION public.sync_animal_on_capture_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND NEW.animal_name IS NOT NULL
     AND NEW.animal_name <> ''
     AND LOWER(NEW.animal_name) <> 'inconnu'
     AND COALESCE(NEW.category, '') <> 'N/A' THEN
    INSERT INTO public.animals (name, scientific_name, category, rarity)
    VALUES (
      NEW.animal_name,
      NEW.scientific_name,
      public.canonical_animal_category(NEW.category, NEW.animal_name, NEW.scientific_name),
      NEW.rarity
    )
    ON CONFLICT (LOWER(name)) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.animals a
SET category = public.canonical_animal_category(a.category, a.name, a.scientific_name)
WHERE a.category IS NULL
   OR btrim(replace(lower(a.category), '(monde)', '')) NOT IN (
     'mammifères','oiseaux','reptiles','amphibiens','poissons','insectes','arachnides','crustacés','mollusques'
   );

UPDATE public.captures c
SET category = public.canonical_animal_category(c.category, c.animal_name, c.scientific_name)
WHERE c.animal_name IS NOT NULL
  AND LOWER(COALESCE(c.animal_name,'')) <> 'inconnu'
  AND COALESCE(c.category, '') <> 'N/A'
  AND (
    c.category IS NULL OR c.category = '' OR
    btrim(replace(lower(c.category), '(monde)', '')) NOT IN (
      'mammifères','oiseaux','reptiles','amphibiens','poissons','insectes','arachnides','crustacés','mollusques'
    )
  );