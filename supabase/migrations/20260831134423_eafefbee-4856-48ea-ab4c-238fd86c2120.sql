ALTER TABLE public.taxa
  ADD COLUMN IF NOT EXISTS iucn_status text,
  ADD COLUMN IF NOT EXISTS iucn_checked_at timestamptz;

ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS iucn_status text;

ALTER TABLE public.taxa
  DROP CONSTRAINT IF EXISTS taxa_iucn_status_check;
ALTER TABLE public.taxa
  ADD CONSTRAINT taxa_iucn_status_check
  CHECK (iucn_status IS NULL OR iucn_status IN ('LC','NT','VU','EN','CR','EW','EX','DD','NE'));

ALTER TABLE public.animals
  DROP CONSTRAINT IF EXISTS animals_iucn_status_check;
ALTER TABLE public.animals
  ADD CONSTRAINT animals_iucn_status_check
  CHECK (iucn_status IS NULL OR iucn_status IN ('LC','NT','VU','EN','CR','EW','EX','DD','NE'));

CREATE INDEX IF NOT EXISTS taxa_iucn_status_idx ON public.taxa (iucn_status);

-- Rang numérique d'une rareté (pour comparer / prendre le max).
CREATE OR REPLACE FUNCTION public.rarity_rank(p_rarity text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p_rarity, 'common'))
    WHEN 'common' THEN 0
    WHEN 'uncommon' THEN 1
    WHEN 'rare' THEN 2
    WHEN 'very_rare' THEN 3
    WHEN 'ultra_rare' THEN 4
    WHEN 'illustration_rare' THEN 5
    WHEN 'special_rare' THEN 6
    WHEN 'hyper_rare' THEN 7
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.rarity_from_rank(p_rank integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE greatest(0, least(7, coalesce(p_rank, 0)))
    WHEN 0 THEN 'common'
    WHEN 1 THEN 'uncommon'
    WHEN 2 THEN 'rare'
    WHEN 3 THEN 'very_rare'
    WHEN 4 THEN 'ultra_rare'
    WHEN 5 THEN 'illustration_rare'
    WHEN 6 THEN 'special_rare'
    ELSE 'hyper_rare'
  END
$$;

-- Plancher de rareté imposé par le statut de conservation UICN.
CREATE OR REPLACE FUNCTION public.rarity_floor_for_iucn(p_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(coalesce(p_status, ''))
    WHEN 'NT' THEN 2  -- plutôt rare
    WHEN 'VU' THEN 3  -- rare
    WHEN 'EN' THEN 4  -- ultra rare
    WHEN 'CR' THEN 5  -- épique
    WHEN 'EW' THEN 6  -- mythique
    WHEN 'EX' THEN 6  -- mythique
    ELSE 0
  END
$$;

/*
 * Rareté hybride : le statut UICN fixe un plancher, la difficulté
 * d'observation (rareté actuelle, calculée sur GBIF) peut aller au-delà.
 * Les espèces domestiques sont toujours communes.
 */
CREATE OR REPLACE FUNCTION public.hybrid_rarity(
  p_observation_rarity text,
  p_iucn_status text,
  p_is_domestic boolean
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN coalesce(p_is_domestic, false) THEN 'common'
    ELSE public.rarity_from_rank(
      greatest(
        public.rarity_rank(p_observation_rarity),
        public.rarity_floor_for_iucn(p_iucn_status)
      )
    )
  END
$$;