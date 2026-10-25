import { supabase } from '@/integrations/supabase/client';

export const COMMUNITY_BADGE_ID = 'community_member';
export const COMMUNITY_BADGE_XP = 50;
const DISCORD_INVITE_URL = 'https://discord.gg/YrAEV5EQa4';

/** Open during the gesture, then persist the idempotent server-authorized reward. */
export async function joinDiscordCommunity(): Promise<boolean> {
  window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer');
  const { data, error } = await supabase.rpc('claim_badge', {
    p_badge_id: COMMUNITY_BADGE_ID,
    p_xp_reward: COMMUNITY_BADGE_XP,
  });
  if (error) throw error;
  return data === true;
}