
-- Reset Pepette's XP to recalculate properly
UPDATE public.profiles
SET xp = 0, level = 0, xp_to_next = 50
WHERE user_id = '31934657-e0bd-4ec0-8fec-0d6154252c89';

-- Re-grant correct total: 9 common captures (540) + milestone bonus at 5 species (100) + 2 follow interactions (20) = 660 XP
SELECT public.grant_xp('31934657-e0bd-4ec0-8fec-0d6154252c89', 660);
