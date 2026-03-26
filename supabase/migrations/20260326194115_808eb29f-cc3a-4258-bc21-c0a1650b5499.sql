
-- 1. Delete the Aigle royal capture
DELETE FROM captures WHERE id = '00542c59-2464-4328-bc69-aff676e512fa';

-- 2. Reset profile stats (5 captures, 5 species, level 3, xp 180, xp_to_next 200)
UPDATE profiles 
SET total_captures = 5, 
    species_count = 5, 
    level = 3, 
    xp = 180, 
    xp_to_next = 200, 
    updated_at = now() 
WHERE user_id = 'fb53d7d5-d325-4ac7-8ff9-b95637e5a561';

-- 3. Reset today's quests: unclaim and reverse progress from Aigle royal
UPDATE daily_quests 
SET completed = false, claimed = false, progress = GREATEST(progress - 1, 0)
WHERE user_id = 'fb53d7d5-d325-4ac7-8ff9-b95637e5a561' 
  AND quest_date = CURRENT_DATE;
