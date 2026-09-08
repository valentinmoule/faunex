-- Binômes partagés par plusieurs races/variétés : plusieurs noms communs légitimes.
CREATE OR REPLACE FUNCTION public.is_shared_domestic_binomial(p_scientific text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(btrim(coalesce(p_scientific, ''))) IN (
    'canis lupus familiaris','canis familiaris','canis lupus','felis catus',
    'felis silvestris catus','equus caballus','equus ferus caballus','equus asinus',
    'equus africanus asinus','bos taurus','ovis aries','capra hircus',
    'capra aegagrus hircus','sus scrofa domesticus','gallus gallus domesticus',
    'oryctolagus cuniculus','oryctolagus cuniculus domesticus',
    'anas platyrhynchos domesticus','anser anser domesticus','columba livia domestica',
    'carassius auratus','cyprinus carpio','betta splendens','serinus canaria',
    'neocaridina davidi','rattus norvegicus','mus musculus','cavia porcellus',
    'mustela putorius furo','meleagris gallopavo','coturnix japonica'
  );
$$;

-- Nom commun canonique déjà présent au catalogue pour un binôme donné.
CREATE OR REPLACE FUNCTION public.catalogue_name_for_binomial(p_scientific text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.name
  FROM public.animals a
  WHERE p_scientific IS NOT NULL
    AND btrim(p_scientific) <> ''
    AND p_scientific ~ '^[A-Z][a-z]+ [a-z-]+$'
    AND NOT public.is_shared_domestic_binomial(p_scientific)
    AND lower(btrim(a.scientific_name)) = lower(btrim(p_scientific))
  ORDER BY a.created_at
  LIMIT 1;
$$;

-- À chaque capture, on réutilise le nom du catalogue plutôt que d'en créer un nouveau.
CREATE OR REPLACE FUNCTION public.enforce_catalogue_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canonical text;
BEGIN
  IF NEW.animal_name IS NULL OR btrim(NEW.animal_name) = '' THEN
    RETURN NEW;
  END IF;
  canonical := public.catalogue_name_for_binomial(NEW.scientific_name);
  IF canonical IS NOT NULL AND lower(btrim(canonical)) <> lower(btrim(NEW.animal_name)) THEN
    NEW.animal_name := canonical;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_enforce_catalogue_name ON public.captures;
CREATE TRIGGER zz_enforce_catalogue_name
BEFORE INSERT OR UPDATE OF animal_name, scientific_name ON public.captures
FOR EACH ROW EXECUTE FUNCTION public.enforce_catalogue_name();