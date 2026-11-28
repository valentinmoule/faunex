import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ imports: 0 }));
vi.mock('@/pages/ExplorersPage', () => { mocks.imports++; return { default: () => null }; });
import { loadTab, prefetchRoute, prefetchTabs } from '@/lib/routePreload';

describe('Navigation preloading', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('shares intent preloading and navigation with a single page import', async () => {
    prefetchRoute('/explorers');
    const first = loadTab('/explorers');
    expect(loadTab('/explorers')).toBe(first);
    await first;
    expect(mocks.imports).toBe(1);
  });
  it('does not preload pages in the background on data-saving connections', () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const schedule = vi.spyOn(window, 'setTimeout');
    prefetchTabs();
    expect(schedule).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
  });
});