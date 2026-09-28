import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimalCard } from '@/data/mockData';
import { setPendingShelve } from '@/lib/shelveAnimation';

const mocks = vi.hoisted(() => {
  const deleteCapture = vi.fn();
  const captureQuery = {
    select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { user_id: 'owner' } })) })) })),
    delete: vi.fn(() => ({ eq: deleteCapture })),
  };
  return { deleteCapture, captureQuery };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => mocks.captureQuery } }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'owner' } }, loading: false, needsUsername: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useSpeciesLocale', () => ({
  useSpeciesName: () => ({ speciesName: (name: string) => name }),
  useSpeciesFacts: () => ({}),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }) }));
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: false }) }));
vi.mock('@/hooks/useCustomCollections', () => ({ useCustomCollections: () => ({ collections: [] }) }));
vi.mock('@/hooks/useSpeciesFinders', () => ({ useSpeciesFinders: () => undefined }));
vi.mock('@/lib/haptics', () => ({ hapticTap: vi.fn(), hapticDiscovery: vi.fn() }));
vi.mock('@/hooks/useAppLocale', () => ({ useSyncAccountLocale: () => undefined }));
vi.mock('@/components/ExplorerPhotosStrip', () => ({ default: () => null }));
vi.mock('@/components/ShareCaptureSheet', () => ({ default: () => null }));
vi.mock('@/components/AddToCollectionSheet', () => ({ default: () => null }));
vi.mock('@/components/HolographicCard', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/RarityBadge', () => ({ default: () => null }));
vi.mock('@/components/PremiumAvatar', () => ({ PremiumAvatar: () => null }));
vi.mock('vaul', () => ({ Drawer: {
  Root: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <>{children}</> : null,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Overlay: () => null,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
} }));

import CardDetailSheet from '@/components/CardDetailSheet';

const card: AnimalCard = {
  id: 'capture-1', name: 'Renard roux', scientificName: 'Vulpes vulpes', image: '/renard.jpg',
  rarity: 'common', category: 'Mammifère', description: '', habitat: '', diet: '',
  conservation: '', funFact: '', discoveredAt: '2026-09-27', location: '',
};

beforeEach(() => {
  mocks.deleteCapture.mockResolvedValue({ error: null });
  sessionStorage.clear();
});
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('Suppression de capture', () => {
  it('ferme la fiche, garde la carte scintillante, puis retire la capture dès la fin de son animation', async () => {
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    const { container, rerender } = render(<CardDetailSheet card={card} open onClose={onClose} onDeleted={onDeleted} />);
    fireEvent.click(await screen.findByRole('button', { name: 'capture.detail.deleteCapture' }));
    fireEvent.click(screen.getByRole('button', { name: 'capture.detail.deleteBtn' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onDeleted).not.toHaveBeenCalled();
    rerender(<CardDetailSheet card={null} open={false} onClose={onClose} onDeleted={onDeleted} />);
    const ghost = document.querySelector('.delete-vanish-card');
    expect(ghost).toBeInTheDocument();
    expect(document.querySelectorAll('.delete-sparkle')).toHaveLength(12);
    expect(container.querySelector('.delete-vanish-card')).toBeNull(); // portal above the closed sheet
    fireEvent.animationEnd(ghost as Element, { animationName: 'delete-sparkle-pop' });
    expect(onDeleted).not.toHaveBeenCalled();
    fireEvent.animationEnd(ghost as Element, { animationName: 'delete-card-vanish' });
    expect(onDeleted).toHaveBeenCalledExactlyOnceWith(card.id);
    expect(document.querySelector('.delete-vanish-stage')).not.toBeInTheDocument();
  });
});

// The shell must retain its card while the destination is still lazy-loading.
// The handoff is only allowed once the flying card has been mounted.
vi.mock('@/lib/lazyWithRetry', () => ({ lazyWithRetry: (factory: () => Promise<{ default: React.ComponentType }>) => React.lazy(factory) }));
vi.mock('@/pages/CapturePage', () => ({ default: () => <div>Capture ready</div> }));
vi.mock('@/pages/BestiairePage', () => ({ default: () => <div>Bestiaire ready</div> }));
vi.mock('@/components/BottomNav', () => ({ default: () => null }));
vi.mock('@/components/PullToDiscover', () => ({ default: () => null }));
vi.mock('@/components/PushPermissionPrompt', () => ({ PushPermissionPrompt: () => null }));
vi.mock('@/components/LevelSplash', () => ({ default: () => null }));
vi.mock('@/components/LevelUpCelebration', () => ({ default: () => null }));
vi.mock('@/components/ProfileDrawer', () => ({ ProfileDrawerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/AppErrorBoundary', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ScrollToTop', () => ({ default: () => null }));
vi.mock('@/components/LoadingScreen', () => ({ default: () => <div>Loading logo</div> }));
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/tooltip', () => ({ TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import App from '@/App';

describe('Rangement dans le Bestiaire', () => {
  it('garde la carte sur un fond opaque pendant la navigation et ne la retire qu’au passage au vol', async () => {
    history.replaceState(null, '', '/capture');
    const view = render(<App />);
    setPendingShelve({ animalName: 'Renard roux', scientificName: 'Vulpes vulpes', category: 'Mammifère', rarity: 'common', imageUrl: '/renard.jpg' });
    act(() => window.dispatchEvent(new Event('faunex:shelve-pending')));
    const holding = document.querySelector('.shelve-holding-card');
    expect(holding).toBeInTheDocument();
    expect(holding?.querySelector('img')).toHaveAttribute('decoding', 'sync');
    expect(document.querySelector('.shelve-holding-backdrop')).toBeInTheDocument();
    history.pushState(null, '', '/bestiaire');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await screen.findByText('Bestiaire ready');
    expect(document.querySelector('.shelve-holding-card')).toBeInTheDocument();
    expect(document.querySelector('.page-transition')).toBeNull();
    act(() => window.dispatchEvent(new Event('faunex:shelve-flight')));
    expect(document.querySelector('.shelve-holding-card')).not.toBeInTheDocument();
    view.unmount();
    history.replaceState(null, '', '/');
  });
});