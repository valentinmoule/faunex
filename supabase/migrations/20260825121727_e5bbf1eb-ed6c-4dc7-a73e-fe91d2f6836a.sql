REVOKE EXECUTE ON FUNCTION public.draw_weekly_quests(date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_share_quest(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_quest_reward(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_weekly_quests_for(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.complete_share_quest(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quest_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_weekly_quests(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_quests_for(uuid) TO service_role;