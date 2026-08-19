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
    WHEN c IN ('mollusques','mollusque',
               'échinodermes','echinodermes','échinoderme','echinoderme',
               'cnidaires','cnidaire',
               'autres invertébrés','autres invertebres','autre invertébré','autre invertebre') THEN 'Mollusques'
    WHEN c IN ('autre (non animal)','autre non animal','autre','autres','other') THEN 'Mollusques'
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
      WHEN hay ~ '(escargot|limace|moule|huître|huitre|poulpe|calmar|seiche|mollusq|ver |vers |annélide|annelide|étoile de mer|etoile de mer|oursin|anémone|anemone|méduse|meduse|holothurie|concombre de mer|ophiure|physalie|velelle|cnidaire|échinoderm|echinoderm)' THEN 'Mollusques'
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