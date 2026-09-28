import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPendingShelve } from '@/lib/shelveAnimation';
import { useShelveAnimation } from './useShelveAnimation';

vi.mock('@/lib/haptics', () => ({ hapticDiscovery: vi.fn() }));

describe('Placement de la carte rangée', () => {
  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('garde la case masquée pendant le vol et la réaffiche à l’atterrissage avant de retirer la volante', async () => {
    setPendingShelve({ animalName: 'Renard roux', scientificName: 'Vulpes vulpes', category: 'Mammifère', rarity: 'common', imageUrl: '' });
    const slot = document.createElement('div');
    slot.getBoundingClientRect = () => ({ left: 100, top: 150, width: 160, height: 200, right: 260, bottom: 350, x: 100, y: 150, toJSON: () => ({}) });
    document.body.appendChild(slot);

    let completeFlight: (() => void) | undefined;
    const flyFinished = new Promise<void>((resolve) => { completeFlight = resolve; });
    const animate = vi.fn(function (this: Element, _frames: Keyframe[], options: KeyframeAnimationOptions) {
      const isFlight = this.classList.contains('shelve-flying-card') && options.duration === 900;
      return { finished: isFlight ? flyFinished : Promise.resolve(), cancel: vi.fn() } as unknown as Animation;
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0));
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });

    const resolveSlot = vi.fn(() => slot);
    const Stage = () => {
      const { pendingShelve, flight, cardRef, backdropRef, labelRef } = useShelveAnimation({ loading: false, resolveSlot });
      return pendingShelve && <>
        <div ref={backdropRef} />
        {flight && <div ref={cardRef} className="shelve-flying-card"><div ref={labelRef} /></div>}
      </>;
    };
    const view = render(<Stage />);
    await waitFor(() => expect(document.querySelector('.shelve-flying-card')).toBeInTheDocument());
    expect(slot.style.visibility).toBe('hidden');
    expect(slot.classList.contains('shelve-slot-flash')).toBe(false);
    expect(animate).toHaveBeenCalled();
    expect(completeFlight).toBeDefined();
    await act(async () => { completeFlight?.(); await flyFinished; });
    await waitFor(() => expect(slot.style.visibility).toBe(''));
    expect(slot).toHaveClass('shelve-slot-flash');
    await waitFor(() => expect(document.querySelector('.shelve-flying-card')).not.toBeInTheDocument());
    view.unmount();
    slot.remove();
  });
});