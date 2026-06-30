CREATE OR REPLACE FUNCTION public.get_public_recent_captures(p_limit integer DEFAULT 12)
RETURNS TABLE(animal_name text, created_at timestamptz, rarity text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.animal_name, c.created_at, c.rarity
  FROM public.captures c
  WHERE c.status = 'approved'
    AND c.animal_name IS NOT NULL
    AND c.animal_name <> ''
  ORDER BY c.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_recent_captures(integer) TO anon, authenticated;