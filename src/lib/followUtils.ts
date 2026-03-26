import { supabase } from '@/integrations/supabase/client';

/**
 * Follow a user, respecting their privacy setting.
 * If target is private → insert with status 'pending'
 * If target is public → insert with status 'accepted'
 * Returns { status: 'accepted' | 'pending', error?: string }
 */
export async function followUser(followerId: string, targetId: string): Promise<{ status: 'accepted' | 'pending'; error?: string }> {
  // Check if target is private
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('is_private')
    .eq('user_id', targetId)
    .single();

  const isPrivate = (targetProfile as any)?.is_private ?? false;
  const followStatus = isPrivate ? 'pending' : 'accepted';

  const { error } = await supabase.from('explorer_follows').insert({
    follower_id: followerId,
    following_id: targetId,
    status: followStatus,
  });

  if (error) {
    if (error.code === '23505') return { status: followStatus, error: 'already_following' };
    return { status: followStatus, error: error.message };
  }

  return { status: followStatus };
}
