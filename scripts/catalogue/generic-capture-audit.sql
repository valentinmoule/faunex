-- Read-only first-wave inventory. Never merge a group into a guessed species.
SELECT c.animal_name, c.scientific_name, c.status, count(*) AS photo_count
FROM public.captures c
WHERE c.animal_name IN ('Fourmi','Fourmi ailée','Araignée','Araignée commune','Mouche','Mouche commune')
GROUP BY c.animal_name,c.scientific_name,c.status
ORDER BY c.animal_name,photo_count DESC;

-- Candidates already carrying an exact species identity. Run the staff-only
-- reclassify_exact_generic_capture RPC per photo; it snapshots and verifies
-- the identity, photo count and earned XP atomically. No group-name mapping.
SELECT c.id AS capture_id, a.id AS target_id, a.name AS target_name, a.scientific_name
FROM public.captures c
JOIN public.animals a ON lower(btrim(c.scientific_name))=lower(btrim(a.scientific_name))
WHERE c.animal_name IN ('Fourmi','Fourmi ailée','Araignée','Araignée commune','Mouche','Mouche commune')
  AND c.status='approved' AND c.xp_awarded=true
  AND a.scientific_name ~ '^[A-Z][a-z]+ [a-z]+$'
  AND NOT public.is_reclassification_group_label(a.name,a.scientific_name)
  AND (SELECT count(*) FROM public.animals other WHERE lower(btrim(other.scientific_name))=lower(btrim(a.scientific_name)))=1;

-- All remaining photos require individual visual review, not a rename.
-- Preview with enrich-capture {capture_id,apply:false,force_name:false}.
-- Keep uncertain photos, their existing tile and XP unchanged. Confirm an
-- existing precise species only when diagnostic characters justify it;
-- never constrain candidates to French fauna or invent a binomial.