import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AnimalCard } from '@/data/mockData';
import { setPendingShelve } from '@/lib/shelveAnimation';
import { publishCaptureImageUpdate } from '@/lib/captureImageUpdates';

const mocks = vi.hoisted(() => {
  const deleteCapture = vi.fn();
  const rpc = vi.fn(async () => ({ data: false, error: null }));
  const saveCrop = vi.fn(async () => '/cropped.jpg');
  const cropPhoto = vi.fn();
  const photos: Array<Record<string, unknown>> = [];
  const feedQuery = { eq: vi.fn(), limit: vi.fn(async () => ({ data: [] })) };
  feedQuery.eq.mockImplementation(() => feedQuery);
  const captureQuery = {
    select: vi.fn(() => { const chain: Record<string, unknown> = { maybeSingle: vi.fn(async () => ({ data: { user_id: 'owner' } })), then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: photos }).then(resolve) }; for (const k of ['eq', 'ilike', 'order']) chain[k] = vi.fn(() => chain); return chain; }),
    delete: vi.fn(() => ({ eq: deleteCapture })),
  };
  return { deleteCapture, captureQuery, feedQuery, rpc, saveCrop, cropPhoto, photos };
});
const bestiaryGate = vi.hoisted(() => ({ pending: null as Promise<void> | null }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: (table: string) => table === 'captures' ? mocks.captureQuery : { select: () => mocks.feedQuery }, functions: { invoke: async () => ({ data: null, error: null }) } } }));
vi.mock('@/lib/captureCrop', () => ({ saveCroppedCaptureImage: mocks.saveCrop }));
vi.mock('@/components/capture/CropPhotoDialog', () => ({ default: ({ photo, onDone }: { photo: string; onDone: (url: string) => void }) => {
  mocks.cropPhoto(photo);
  return <button onClick={() => onDone('cropped-data')}>Apply test crop</button>;
} }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
const authState = { session: { user: { id: 'owner' } }, loading: false, needsUsername: false };
vi.mock('@/hooks/useSpeciesLocale', () => ({
  useSpeciesName: () => ({ speciesName: (name: string) => name }),
  useSpeciesFacts: () => ({}),
}));
vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }),
}));
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }) }));
vi.mock('@/hooks/useSpeciesFavorites', () => ({ useSpeciesFavorites: () => ({ isSpeciesFavorite: () => false, setSpeciesFavorite: vi.fn() }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: false }) }));
vi.mock('@/hooks/useCustomCollections', () => ({ useCustomCollections: () => ({ collections: [], collectionsForSpecies: () => new Set() }) }));
vi.mock('@/hooks/useSpeciesFinders', () => ({ useSpeciesFinders: () => undefined }));
vi.mock('@/lib/haptics', () => ({ hapticTap: vi.fn(), hapticDiscovery: vi.fn() }));
vi.mock('@/hooks/useAppLocale', () => ({ useSyncAccountLocale: () => undefined }));
vi.mock('@/components/ExplorerPhotosStrip', () => ({ default: () => null }));
vi.mock('@/components/ShareCaptureSheet', () => ({ default: () => null }));
vi.mock('@/components/HolographicCard', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/RarityBadge', () => ({ default: () => null }));
vi.mock('@/components/PremiumAvatar', () => ({ PremiumAvatar: () => null }));
vi.mock('@/components/OverflowMenu', () => {
  const Menu = ({ label, items }: { label: string; items: Array<{ label: string; onSelect: () => void }> }) => (
    <div><button type="button" aria-label={label} />{items.map((i) => <button key={i.label} type="button" role="menuitem" onClick={i.onSelect}>{i.label}</button>)}</div>
  );
  return { default: Menu, OverflowMenu: Menu };
});
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

describe('Navigation dans Mes captures', () => {
  it('change de capture par glissement horizontal sans fermer la fiche', async () => {
    const nextCard = { ...card, id: 'capture-2', name: 'Lapin domestique', scientificName: 'Oryctolagus cuniculus' };
    const onCaptureSelect = vi.fn();
    const onClose = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const sheet = (selected: AnimalCard) => <QueryClientProvider client={qc}>
      <MemoryRouter><CardDetailSheet card={selected} open onClose={onClose}
        captures={[card, nextCard]} onCaptureSelect={onCaptureSelect} /></MemoryRouter>
    </QueryClientProvider>;
    const view = render(sheet(card));
    const target = view.container.querySelector('h3');
    if (!target) throw new Error('Capture not rendered');
    fireEvent.touchStart(target, { touches: [{ clientX: 250, clientY: 200 }] });
    fireEvent.touchEnd(target, { changedTouches: [{ clientX: 140, clientY: 205 }] });
    expect(onCaptureSelect).toHaveBeenLastCalledWith(nextCard);
    expect(onClose).not.toHaveBeenCalled();
    onCaptureSelect.mockClear();
    view.rerender(sheet(nextCard));
    const nextTarget = view.container.querySelector('h3');
    if (!nextTarget) throw new Error('Next capture not rendered');
    fireEvent.touchStart(nextTarget, { touches: [{ clientX: 140, clientY: 200 }] });
    fireEvent.touchEnd(nextTarget, { changedTouches: [{ clientX: 250, clientY: 205 }] });
    expect(onCaptureSelect).toHaveBeenLastCalledWith(card);
    onCaptureSelect.mockClear();
    fireEvent.touchStart(nextTarget, { touches: [{ clientX: 140, clientY: 200 }] });
    fireEvent.touchEnd(nextTarget, { changedTouches: [{ clientX: 145, clientY: 350 }] });
    expect(onCaptureSelect).not.toHaveBeenCalled();
    view.unmount();
  });
});

beforeEach(() => {
  mocks.photos.length = 0;
  mocks.deleteCapture.mockResolvedValue({ error: null });
  sessionStorage.clear();
});
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('Actions sur une photo précise', () => {
  const renderPhotos = () => {
    mocks.photos.push(
      { id: card.id, image_url: '/new.jpg', created_at: '2026-11-25', location: 'Paris' },
      { id: 'older-photo', image_url: '/old.jpg', created_at: '2026-11-24', location: 'Lyon' },
    );
    const onDeleted = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={qc}><MemoryRouter>
      <CardDetailSheet card={card} open onClose={vi.fn()} onDeleted={onDeleted} />
    </MemoryRouter></QueryClientProvider>);
    return { ...view, onDeleted };
  };

  it('libère uniquement la deuxième photo sélectionnée', async () => {
    const view = renderPhotos();
    await screen.findAllByRole('tab');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fireEvent.click(await screen.findByRole('button', { name: 'capture.photoActions.release' }));
    fireEvent.click(screen.getByRole('button', { name: 'capture.detail.deleteBtn' }));
    await waitFor(() => expect(mocks.deleteCapture).toHaveBeenCalledExactlyOnceWith('id', 'older-photo'));
    expect(view.onDeleted).toHaveBeenCalledExactlyOnceWith('older-photo');
    view.unmount();
  });

  it('envoie la correction de la photo sélectionnée et non celle de couverture', async () => {
    const view = renderPhotos();
    await screen.findAllByRole('tab');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fireEvent.click(await screen.findByRole('button', { name: 'capture.photoActions.report' }));
    fireEvent.change(screen.getByLabelText('capture.correction.name'), { target: { value: 'Renard arctique' } });
    fireEvent.click(screen.getByRole('button', { name: 'capture.actions.requestVerificationBtn' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('request_capture_correction', {
      p_capture: 'older-photo', p_name: 'Renard arctique', p_scientific: undefined, p_note: undefined,
    }));
    view.unmount();
  });

  it('recadre la photo sélectionnée et garde sa nouvelle image après changement de photo', async () => {
    const view = renderPhotos();
    await screen.findAllByRole('tab');
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fireEvent.click(await screen.findByRole('button', { name: 'capture.photoActions.crop' }));
    expect(mocks.cropPhoto).toHaveBeenLastCalledWith('/old.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Apply test crop' }));
    await waitFor(() => expect(mocks.saveCrop).toHaveBeenCalledExactlyOnceWith('older-photo', 'cropped-data'));
    act(() => publishCaptureImageUpdate({ captureId: 'older-photo', userId: 'owner', imageUrl: '/cropped.jpg' }));
    fireEvent.click(screen.getAllByRole('tab')[0]);
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fireEvent.click(await screen.findByRole('button', { name: 'capture.photoActions.crop' }));
    expect(mocks.cropPhoto).toHaveBeenLastCalledWith('/cropped.jpg');
    view.unmount();
  });
});

describe('Suppression de capture', () => {
  it('retire la vraie tuile sous le snapshot animé pour éviter toute réapparition à la fin', async () => {
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const sheet = (c: AnimalCard | null, open: boolean) => (
      <QueryClientProvider client={qc}>
        <MemoryRouter><CardDetailSheet card={c} open={open} onClose={onClose} onDeleted={onDeleted} /></MemoryRouter>
      </QueryClientProvider>
    );
    const { container, rerender } = render(sheet(card, true));
    const moreBtn = await screen.findByRole('button', { name: 'common.moreActions' });
    fireEvent.keyDown(moreBtn, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'capture.detail.deleteCapture' }));
    fireEvent.click(screen.getByRole('button', { name: 'capture.detail.deleteBtn' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onDeleted).toHaveBeenCalledExactlyOnceWith(card.id);
    rerender(sheet(null, false));
    const ghost = document.querySelector('.delete-vanish-card');
    expect(ghost).toBeInTheDocument();
    expect(document.querySelectorAll('.delete-sparkle')).toHaveLength(12);
    expect(container.querySelector('.delete-vanish-card')).toBeNull(); // portal above the closed sheet
    const sparkleEnd = new Event('animationend', { bubbles: true });
    Object.defineProperty(sparkleEnd, 'animationName', { value: 'delete-sparkle-pop' });
    fireEvent(ghost as Element, sparkleEnd);
    expect(onDeleted).toHaveBeenCalledOnce();
    const cardEnd = new Event('animationend', { bubbles: true });
    Object.defineProperty(cardEnd, 'animationName', { value: 'delete-card-vanish' });
    fireEvent(ghost as Element, cardEnd);
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(document.querySelector('.delete-vanish-stage')).not.toBeInTheDocument();
  });
});

// The shell must retain its card while the destination is still lazy-loading.
// The handoff is only allowed once the flying card has been mounted.
vi.mock('@/lib/lazyWithRetry', () => ({ lazyWithRetry: (factory: () => Promise<{ default: React.ComponentType }>) => React.lazy(factory) }));
vi.mock('@/pages/CapturePage', () => ({ default: () => <div>Capture ready</div> }));
vi.mock('@/pages/BestiairePage', () => ({ default: () => {
  if (bestiaryGate.pending) throw bestiaryGate.pending;
  return <div>Bestiaire ready</div>;
} }));
vi.mock('@/components/BottomNav', () => ({ default: () => null }));
vi.mock('@/components/PushPermissionPrompt', () => ({ PushPermissionPrompt: () => null }));
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
  it('n’affiche aucun écran intermédiaire avec la carte avant le vrai Bestiaire', async () => {
    history.replaceState(null, '', '/capture');
    const view = render(<App />);
    let release: (() => void) | undefined;
    bestiaryGate.pending = new Promise<void>((resolve) => { release = resolve; });
    setPendingShelve({ animalName: 'Renard roux', scientificName: 'Vulpes vulpes', category: 'Mammifère', rarity: 'common', imageUrl: '/renard.jpg' });
    act(() => window.dispatchEvent(new Event('faunex:shelve-pending')));
    expect(document.querySelector('.shelve-holding-card')).not.toBeInTheDocument();
    expect(document.querySelector('.shelve-holding-stage')).not.toBeInTheDocument();
    history.pushState(null, '', '/bestiaire');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(document.querySelector('.shelve-holding-card')).not.toBeInTheDocument();
    bestiaryGate.pending = null;
    await act(async () => { release?.(); });
    await screen.findByText('Bestiaire ready');
    expect(document.querySelector('.page-transition')).toBeNull();
    view.unmount();
    bestiaryGate.pending = null;
    history.replaceState(null, '', '/');
  });
});