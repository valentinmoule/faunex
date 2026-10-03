-- Remove pending submissions already covered by an approved capture of the same user.
DELETE FROM public.captures p
WHERE p.status = 'pending_review'
  AND EXISTS (
    SELECT 1 FROM public.captures a
    WHERE a.user_id = p.user_id
      AND a.status = 'approved'
      AND lower(btrim(a.animal_name)) = lower(btrim(p.animal_name))
  );

-- Keep only the oldest pending submission per user and name.
DELETE FROM public.captures p
USING (
  SELECT id, row_number() OVER (
    PARTITION BY user_id, lower(btrim(animal_name)) ORDER BY created_at, id
  ) AS rn
  FROM public.captures
  WHERE status = 'pending_review'
) d
WHERE p.id = d.id AND d.rn > 1;

-- Server-side guard: one pending submission per user and species name.
CREATE UNIQUE INDEX IF NOT EXISTS captures_unique_pending_per_user
  ON public.captures (user_id, lower(btrim(animal_name)))
  WHERE status = 'pending_review';