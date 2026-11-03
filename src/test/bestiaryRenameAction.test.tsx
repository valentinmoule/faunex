import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
  Trans: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'admin' } } }),
}));
vi.mock('@/hooks/useCatalogueModeration', () => ({
  useCatalogueModeration: () => ({ canDeleteSpecies: true, canMergeSpecies: true }),
  deleteBestiarySpecies: mocks.remove,
}));
vi.mock('@/hooks/usePhotoContest', () => ({ useContestWinnerCaptures: () => ({ data: null }) }));
vi.mock('@/hooks/useSpeciesLocale', () => ({
  useSpeciesName: () => ({ speciesName: (name: string) => name }),
  useSpeciesFacts: () => ({ description: '', habitat: '', diet: '', funFact: '' }),
}));
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: () => ({ isFavorite: false, toggleFavorite: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: false }) }));
vi.mock('@/hooks/useSpeciesFinders', () => ({ useSpeciesFinders: () => 0 }));
vi.mock('@/hooks/useCustomCollections', () => ({
  useCustomCollections: () => ({
    collections: [],
    collectionsForSpecies: () => new Set<string>(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    createCollection: vi.fn(),
  }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError, info: vi.fn(), warning: vi.fn() } }));
vi.mock('@/data/mockData', () => ({
  normalizeRarity: (value: string) => value,
  RARITY_LABELS: {},
  RARITY_FX: {},
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        neq: () => query,
        or: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: { id: 'animal-1', name: 'Lion', scientific_name: 'Panthera leo' } }),
      };
      return query;
    },
    rpc: async () => ({ error: null }),
  },
}));

import CardDetailSheet from '@/components/CardDetailSheet';

const card = {
  id: 'uncaptured-lion',
  name: 'Lion',
  scientificName: 'Panthera leo',
  image: '',
  rarity: 'common',
  category: 'Mammifères',
  description: '',
  habitat: '',
  diet: '',
  conservation: '',
  funFact: '',
  discoveredAt: '',
  location: '',
} as any;

async function openAction(label: string) {
  render(<CardDetailSheet card={card} open onClose={vi.fn()} communityFinders={1} />);
  fireEvent.click(await screen.findByRole('button', { name: 'common.moreActions' }));
  fireEvent.click(await screen.findByRole('button', { name: label }));
  await waitFor(() => expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeTruthy());
}

describe('Bestiary card admin actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('opens a common-name field, not the merge search, from "Change common name"', async () => {
    await openAction('species.reportsAdmin.vernacular');
    expect(document.querySelector('#report-new-name')).toBeTruthy();
    expect(document.querySelector('[aria-label="species.reportsAdmin.search"]')).toBeNull();
  });

  it('opens a scientific-name field, not the merge search, from "Change scientific name"', async () => {
    await openAction('species.reportsAdmin.scientific');
    expect(document.querySelector('#report-new-name')).toBeTruthy();
    expect(document.querySelector('[aria-label="species.reportsAdmin.search"]')).toBeNull();
  });

  it('opens the merge search, without a name field, from "Merge"', async () => {
    await openAction('species.reportsAdmin.merge');
    expect(document.querySelector('[aria-label="species.reportsAdmin.search"]')).toBeTruthy();
    expect(document.querySelector('#report-new-name')).toBeNull();
  });
});
