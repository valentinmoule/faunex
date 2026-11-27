import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnimalIdentification } from './useAnimalIdentification';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke }, auth: { getSession: async () => ({ data: { session: null } }) } } }));
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key, language: 'fr' } }));
vi.mock('@/lib/imageProcessing', () => ({
  compressForAI: async (value: string) => value,
  dataUrlBytes: () => 100,
  hashDataUrl: async (value: string) => value,
}));
vi.mock('@/lib/dataset', () => ({ logDatasetEvent: vi.fn(), setPendingImageHash: vi.fn() }));
vi.mock('@/lib/haptics', () => ({ hapticSuccess: vi.fn() }));

describe('human identification rejection', () => {
  beforeEach(() => { localStorage.clear(); invoke.mockReset(); });

  it.each([
    { success: false, reason: 'human', image_type: 'humain' },
    { success: false, reason: 'not_a_real_photo', image_type: 'humain' },
    { success: false, reason: 'not_a_real_photo', image_type: 'animal_mort_ou_plat', animal: { animal_name: 'Humain', scientific_name: 'Homo sapiens' } },
  ])('prioritizes the human refusal: %j', async (data) => {
    invoke.mockResolvedValue({ data, error: null });
    const { result } = renderHook(() => useAnimalIdentification());
    await act(async () => {
      expect(await result.current.identify(JSON.stringify(data))).toMatchObject({
        status: 'rejected', kind: 'human', message: 'capture.rejected.human.message',
      });
    });
  });

  it('keeps the dead animal refusal for actual dead animals', async () => {
    invoke.mockResolvedValue({ data: { success: false, reason: 'not_a_real_photo', image_type: 'animal_mort_ou_plat' }, error: null });
    const { result } = renderHook(() => useAnimalIdentification());
    await act(async () => {
      expect(await result.current.identify('dead-animal')).toMatchObject({ status: 'rejected', kind: 'dead' });
    });
  });

  it('does not reuse an old misclassified rejection from local storage', async () => {
    localStorage.setItem('faunex.identify.cache.v1', JSON.stringify({
      'old-human': { at: Date.now(), outcome: { status: 'rejected', kind: 'dead' } },
    }));
    invoke.mockResolvedValue({ data: { success: false, reason: 'human' }, error: null });
    const { result } = renderHook(() => useAnimalIdentification());
    await act(async () => {
      expect(await result.current.identify('old-human')).toMatchObject({ status: 'rejected', kind: 'human' });
    });
    expect(invoke).toHaveBeenCalled();
  });

  it.each([false, true])('never retries or caches a Premium quota refusal (daily=%s)', async (daily) => {
    const refusal = { success: false, reason: 'daily_limit', premium_safety_pause: true,
      premium_daily_limit: daily, retry_at: '2026-11-27T21:00:00Z' };
    invoke.mockResolvedValueOnce({ data: { reason: 'cache_miss' }, error: null });
    invoke.mockResolvedValue({ data: refusal, error: null });
    const { result, unmount } = renderHook(() => useAnimalIdentification());
    await act(async () => {
      expect((await result.current.identify(`quota-${daily}`)).status).toBe('error');
    });
    expect(invoke).toHaveBeenCalledTimes(2);
    await act(async () => {
      expect((await result.current.identify(`quota-${daily}`)).status).toBe('error');
    });
    expect(invoke).toHaveBeenCalledTimes(3);
    unmount();
  });
});