CREATE OR REPLACE FUNCTION public.is_shared_domestic_binomial(p_scientific text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT lower(btrim(coalesce(p_scientific,''))) IN (
 'canis lupus familiaris','canis familiaris','canis lupus','felis catus',
 'felis silvestris catus','equus caballus','equus ferus caballus','equus asinus',
 'equus africanus asinus','bos taurus','ovis aries','capra hircus',
 'capra aegagrus hircus','sus scrofa domesticus','gallus gallus domesticus',
 'oryctolagus cuniculus','oryctolagus cuniculus domesticus',
 'anas platyrhynchos domesticus','anser anser domesticus','columba livia domestica',
 'carassius auratus','cyprinus carpio','betta splendens','serinus canaria',
 'neocaridina davidi','rattus norvegicus','mus musculus','cavia porcellus',
 'mustela putorius furo','meleagris gallopavo','coturnix japonica','pavo cristatus');
$$;