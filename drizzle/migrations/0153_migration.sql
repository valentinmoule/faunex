CREATE OR REPLACE FUNCTION public.nearby_sightings(p_lat double precision, p_lng double precision, p_radius_km double precision DEFAULT 10)
 RETURNS TABLE(animal_name text, scientific_name text, category text, rarity text, lat double precision, lng double precision, distance_km double precision, seen_at timestamp with time zone, sightings integer, locked boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_r double precision := LEAST(GREATEST(coalesce(p_radius_km,10),1),30); v_prem boolean;
BEGIN
  IF v_uid IS NULL OR p_lat IS NULL OR p_lng IS NULL OR abs(p_lat) > 90 OR abs(p_lng) > 180 THEN RETURN; END IF;
  v_prem := public.is_premium(v_uid);
  RETURN QUERY
  WITH base AS (
    SELECT c.animal_name AS n, c.scientific_name AS sn, c.category AS cat, c.rarity AS rar, c.latitude AS la, c.longitude AS lo, c.created_at AS ca, c.user_id AS uid
    FROM public.captures c
    WHERE c.status = 'approved' AND c.shared = true AND c.user_id <> v_uid
      AND c.created_at > now() - interval '14 days'
      AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      AND c.latitude BETWEEN p_lat - v_r/111.0 AND p_lat + v_r/111.0
      AND c.longitude BETWEEN p_lng - v_r/(111.0*greatest(cos(radians(p_lat)),0.1)) AND p_lng + v_r/(111.0*greatest(cos(radians(p_lat)),0.1))
      AND NOT EXISTS (SELECT 1 FROM public.captures m WHERE m.user_id = v_uid AND m.status = 'approved' AND lower(m.animal_name) = lower(c.animal_name))
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id AND u.email = 'valentinmoulay+test@gmail.com')
  ), agg AS (
    SELECT DISTINCT ON (lower(b.n)) b.n, b.sn, b.cat, b.rar, b.la, b.lo, b.ca,
      (SELECT count(DISTINCT b2.uid) FROM base b2 WHERE lower(b2.n) = lower(b.n))::int AS cnt
    FROM base b ORDER BY lower(b.n), b.ca DESC
  ), ranked AS (
    SELECT a.*, row_number() OVER (ORDER BY a.cnt DESC, a.ca DESC) AS rk FROM agg a
  )
  SELECT CASE WHEN v_prem OR r.rk = 1 THEN r.n END,
    CASE WHEN v_prem OR r.rk = 1 THEN r.sn END,
    r.cat, r.rar,
    round(r.la::numeric, 2)::double precision, round(r.lo::numeric, 2)::double precision,
    round((6371 * 2 * asin(sqrt(power(sin(radians(r.la - p_lat)/2),2) + cos(radians(p_lat))*cos(radians(r.la))*power(sin(radians(r.lo - p_lng)/2),2))))::numeric, 1)::double precision,
    CASE WHEN v_prem OR r.rk = 1 THEN r.ca END,
    CASE WHEN v_prem OR r.rk = 1 THEN r.cnt ELSE 0 END,
    NOT (v_prem OR r.rk = 1)
  FROM ranked r WHERE r.rk <= 10
  ORDER BY r.rk;
END $function$;