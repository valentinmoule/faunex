import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import frSocial from '@/i18n/locales/fr/social.json';

const mocks = vi.hoisted(() => ({ followCount: 0 as number | null }));

// Le classement « Abonnements » est réservé aux Premium : on lève la barrière pour
// tester uniquement ce qui s'affiche quand on ne suit personne.
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPremium: true, loading: false, refresh: async () => {} }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'moi' } },
    user: { id: 'moi' },
    loading: false,
    needsUsername: false,
    signOut: async () => {},
    recheckUsername: async () => {},
  }),
}));

// Compteur d'abonnements : la requête est thenable comme le builder Supabase.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        then: (resolve: (value: { count: number | null }) => void) =>
          Promise.resolve({ count: mocks.followCount }).then(resolve),
      };
      return query;
    },
    rpc: vi.fn(async () => ({ data: [], error: null })),
    channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
    removeChannel: vi.fn(),
  },
}));

// Le classement lui-même est testé ailleurs : ici on ne regarde que sa présence.
vi.mock('@/components/CategoryLeaderboard', () => ({
  default: () => <div data-testid="board" />,
  LeaderboardResetBadge: () => null,
}));

vi.mock('@/components/CategoryChipRow', () => ({
  Chip: ({ label, selected, onClick }: { label: string; selected: boolean; onClick?: () => void }) => (
    <button role="radio" aria-checked={selected} onClick={onClick}>{label}</button>
  ),
  categoryChipImage: () => '',
}));

vi.mock('@/lib/haptics', () => ({ hapticTap: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

// On rend les vrais libellés français pour que le test échoue si le texte change.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const parts = key.split('.');
      let node: unknown = { social: frSocial.social };
      for (const part of parts) {
        if (!node || typeof node !== 'object') return key;
        node = (node as Record<string, unknown>)[part];
      }
      return typeof node === 'string' ? node : key;
    },
  }),
}));

import ExplorersLeaderboard from '@/components/ExplorersLeaderboard';

const openFollowsRanking = async () => {
  fireEvent.click(screen.getByRole('radio', { name: 'Abonnements' }));
};

/**
 * Règle : dans le classement « Abonnements », un explorateur qui ne suit
 * personne voit un état vide l'invitant à chercher des explorateurs.
 */
describe('Classement « Abonnements » sans abonnement', () => {
  it('invite à chercher des explorateurs quand on ne suit personne', async () => {
    mocks.followCount = 0;
    render(<ExplorersLeaderboard />);
    await openFollowsRanking();

    await waitFor(() => expect(screen.getByText('Tu ne suis personne')).toBeTruthy());
    expect(screen.getByText('Suis des explorateurs pour voir leurs captures et leur niveau dans ce classement.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chercher des explorateurs' })).toBeTruthy();
    expect(screen.queryByTestId('board')).toBeNull();
  });

  it('affiche le classement dès qu’on suit au moins un explorateur', async () => {
    mocks.followCount = 3;
    render(<ExplorersLeaderboard />);
    await openFollowsRanking();

    await waitFor(() => expect(screen.getByTestId('board')).toBeTruthy());
    expect(screen.queryByText('Tu ne suis personne')).toBeNull();
  });
});
