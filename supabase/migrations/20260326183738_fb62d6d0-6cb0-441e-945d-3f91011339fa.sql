-- Allow service role to delete quests (for cleanup)
CREATE POLICY "Service role can delete quests"
ON public.daily_quests
FOR DELETE
TO public
USING (auth.role() = 'service_role');

-- Clean up duplicate quests: keep only 3 per user per day
DELETE FROM daily_quests
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, quest_date ORDER BY created_at) as rn
    FROM daily_quests
  ) sub
  WHERE rn <= 3
);