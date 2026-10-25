import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { publishCaptureImageUpdate, subscribeCaptureImageUpdates, updateCaptureImage } from '@/lib/captureImageUpdates';
import { useBestiaryData } from '@/hooks/useBestiaryData';
import type { AnimalCard } from '@/data/mockData';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/bestiaryCache', () => ({ readCatalogueCache: () => null, writeCatalogueCache: vi.fn() }));
vi.mock('@/lib/shelveAnimation', () => ({ peekPendingShelve: () => null }));

const card = { id: 'capture-1', image: 'original.jpg', name: 'Chat domestique' } as AnimalCard;
const update = { captureId: 'capture-1', userId: 'owner', imageUrl: 'cropped.jpg' };

describe('Capture image updates', () => {
  it('replaces only the edited capture photo', () => {
    expect(updateCaptureImage(card, update).image).toBe('cropped.jpg');
    const other = { ...card, id: 'capture-2' };
    expect(updateCaptureImage(other, update)).toBe(other);
  });

  it('notifies mounted views and removes unmounted listeners', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCaptureImageUpdates(listener);
    publishCaptureImageUpdate(update);
    expect(listener).toHaveBeenCalledWith(update);
    unsubscribe();
    publishCaptureImageUpdate(update);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('updates the mounted capture grid immediately after a save event', () => {
    const hook = renderHook(() => useBestiaryData(undefined));
    act(() => hook.result.current.setMyCaptures([card]));
    act(() => publishCaptureImageUpdate({ ...update, userId: undefined as unknown as string }));
    expect(hook.result.current.myCaptures[0].image).toBe('cropped.jpg');
    hook.unmount();
  });
});