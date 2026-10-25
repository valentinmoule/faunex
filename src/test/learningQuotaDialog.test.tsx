import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LearningPage from '@/pages/LearningPage';

const mocks = vi.hoisted(() => ({ start: vi.fn(), limit: 10 }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'user' } } }) }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => ({ isPremium: true, loading: false }) }));
vi.mock('@/components/CurrencyBalance', () => ({ default: () => null }));
vi.mock('@/components/CaptureQuotaBadge', () => ({ default: () => null }));
vi.mock('@/components/LearningPlayer', () => ({ default: () => <div data-testid="revision" /> }));
vi.mock('@/lib/learning', () => ({
  learningText: (item: Record<string, string>, key: string) => item[key],
  startLesson: mocks.start,
  learningStatus: async () => ({ used: mocks.limit, limit: mocks.limit, reset_at: '2026-10-26T00:00:00Z', completed: [{ path_id: 'path', lesson_id: 'done' }], paths: [{ id: 'path', title: 'Parcours', chapters: [{ title: 'Jardin', lessons: [{ id: 'done', title: 'Déjà faite' }, { id: 'next', title: 'À faire' }] }] }] }),
}));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><LearningPage /></MemoryRouter></QueryClientProvider>);
}

describe('Daily learning limit dialog', () => {
  beforeEach(() => {
    mocks.start.mockReset(); mocks.limit = 10;
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  });
  it('can be dismissed and reopened by the next step without starting a lesson', async () => {
    mount();
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'learning.backPath' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'À faire · learning.current' }));
    await screen.findByRole('dialog');
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it('still starts a completed step as revision at the daily limit', async () => {
    mocks.start.mockResolvedValue({ id: 'revision', lesson: { id: 'done' } });
    mount(); await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Déjà faite · learning.done' }));
    await screen.findByTestId('revision');
    expect(mocks.start).toHaveBeenCalledWith('path', 'done');
  });
});