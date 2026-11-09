CREATE OR REPLACE FUNCTION public.is_shared_domestic_binomial(p_scientific text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
 SELECT lower(btrim(coalesce(p_scientific,''))) IN (
 'canis lupus familiaris','canis familiaris','canis lupus','felis catus',
 'felis silvestris catus','equus caballus','equus ferus caballus','equus asinus',
 'equus africanus asinus','bos taurus','bos primigenius taurus','ovis aries','capra hircus',
 'capra aegagrus hircus','sus scrofa domesticus','gallus gallus domesticus','gallus gallus',
 'oryctolagus cuniculus','oryctolagus cuniculus domesticus',
 'anas platyrhynchos domesticus','anser anser domesticus','columba livia domestica',
 'carassius auratus','cyprinus carpio','betta splendens','serinus canaria','serinus canaria domestica',
 'neocaridina davidi','rattus norvegicus','mus musculus','cavia porcellus','mesocricetus auratus',
 'mustela putorius furo','meleagris gallopavo','coturnix japonica','pavo cristatus')
 -- Any domestic form (third+ epithet domesticus/domestica/familiaris) is shared by its breeds.
 OR lower(coalesce(p_scientific,'')) ~ '^\s*[a-z]+\s+[a-z]+\s+.*\m(domesticus|domestica|domesticum|familiaris)\M';
$function$;