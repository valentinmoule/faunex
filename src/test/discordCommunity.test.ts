import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { joinDiscordCommunity } from '@/lib/discordCommunity';

describe('Discord community badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('opens Discord immediately and claims the community badge on click', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const result = joinDiscordCommunity();
    expect(window.open).toHaveBeenCalledWith('https://discord.gg/YrAEV5EQa4', '_blank', 'noopener,noreferrer');
    expect(rpc).toHaveBeenCalledWith('claim_badge', { p_badge_id: 'community_member', p_xp_reward: 50 });
    expect(await result).toBe(true);
  });

  it('does not announce a second reward when the server says already claimed', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await joinDiscordCommunity()).toBe(false);
  });

  it('never reports an unlocked badge when persistence fails', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('offline') });
    await expect(joinDiscordCommunity()).rejects.toThrow('offline');
    expect(window.open).toHaveBeenCalledOnce();
  });
});