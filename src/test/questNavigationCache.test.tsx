import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), uid: 'alice', completed: false, claimed: false, premium: false, refresh: undefined as (() => void) | undefined }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: mocks.uid } } }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: mocks.premium, loading: false }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/rewards/RewardBurst', () => ({ default: () => null }));
vi.mock('@/lib/haptics', () => ({ hapticSuccess: () => {} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, from: mocks.from,
  channel: () => { const chain = { on: (_event: unknown, _filter: unknown, cb: () => void) => { mocks.refresh = cb; return chain; }, subscribe: () => chain }; return chain; },
  removeChannel: vi.fn(),
} }));
import QuestsInline from '@/components/QuestsInline';

describe('Challenges query cache', () => {
  let client: QueryClient;
  const mount = () => render(<QueryClientProvider client={client}><MemoryRouter><QuestsInline /></MemoryRouter></QueryClientProvider>);
  beforeEach(() => {
    mocks.uid = 'alice'; mocks.completed = false; mocks.claimed = false; mocks.premium = false;
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mocks.rpc.mockReset().mockImplementation(async (name: string) => {
      if (name === 'claim_quest_reward') { mocks.claimed = true; return { data: true, error: null }; }
      return { data: [], error: null };
    });
    mocks.from.mockReset().mockImplementation(() => { const chain = { select: () => chain, eq: () => chain, gte: () => chain, order: async () => ({ data: [{ id: `${mocks.uid}-quest`, quest_type: 'capture', description: `${mocks.uid} quest`, target: 3, progress: mocks.completed ? 3 : 1, completed: mocks.completed, claimed: mocks.claimed, xp_reward: 25, period: 'week' }], error: null }) }; return chain; });
  });
  afterEach(() => { client.clear(); });
  it('reuses quests on return without another ensure or query, then refreshes progress through realtime', async () => {
    const first = mount(); await screen.findByText('alice quest');
    const calls = mocks.from.mock.calls.length;
    const ensures = mocks.rpc.mock.calls.filter(([name]) => name === 'ensure_weekly_quests').length;
    first.unmount();
    const revisit = mount();
    expect(screen.getByText('alice quest')).toBeInTheDocument();
    expect(mocks.from).toHaveBeenCalledTimes(calls);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'ensure_weekly_quests')).toHaveLength(ensures);
    mocks.completed = true;
    await act(async () => { mocks.refresh?.(); });
    await screen.findByRole('button', { name: 'profile.quests.claim' });
    expect(mocks.from.mock.calls.length).toBeGreaterThan(calls);
    fireEvent.click(screen.getByRole('button', { name: 'profile.quests.claim' }));
    await waitFor(() => expect(screen.queryByText('alice quest')).not.toBeInTheDocument());
    revisit.unmount();
    const afterClaim = mount();
    expect(screen.queryByText('alice quest')).not.toBeInTheDocument();
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'claim_quest_reward')).toHaveLength(1);
    afterClaim.unmount();
  });
  it('does not reuse another account quests', async () => {
    const first = mount(); await screen.findByText('alice quest'); first.unmount();
    mocks.uid = 'bob'; const second = mount();
    expect(screen.queryByText('alice quest')).not.toBeInTheDocument();
    await screen.findByText('bob quest'); second.unmount();
  });
});