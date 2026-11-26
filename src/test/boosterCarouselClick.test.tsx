import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BoosterCarousel from '@/components/BoosterCarousel';

// jsdom ne fournit ni ResizeObserver ni Element.scrollTo, utilisés au montage.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

/** Enregistre les recentrages du carrousel. */
const scrollTo = vi.fn();
Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;

/**
 * Appui simulé : le carrousel distingue la souris du doigt via pointerType,
 * ce que jsdom ne fait pas pour nous.
 */
const fire = (el: Element, type: string, props: Record<string, unknown>) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, props);
  el.dispatchEvent(ev);
};

const renderCarousel = () => {
  const openFirst = vi.fn();
  const openSecond = vi.fn();
  render(
    <BoosterCarousel>
      <button onClick={openFirst}>A</button>
      <button onClick={openSecond}>B</button>
    </BoosterCarousel>,
  );
  const outer = screen.getByText('A').closest('.booster-carousel') as HTMLElement;
  const track = outer.firstElementChild as HTMLElement;
  // Ramène le sachet centré sur le premier (tous les offsets valent 0 sous jsdom).
  fireEvent.scroll(track);
  scrollTo.mockClear();
  return { openFirst, openSecond, track };
};

describe('clic sur un sachet voisin du carrousel de collections', () => {
  it('ouvre la collection quand on clique à la souris', () => {
    const { openSecond, track } = renderCarousel();
    fire(track, 'pointerdown', { pointerType: 'mouse', button: 0, clientX: 300 });
    fireEvent.click(screen.getByText('B'));
    expect(openSecond).toHaveBeenCalledTimes(1);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('recentre encore au doigt sans ouvrir la collection', () => {
    const { openSecond, track } = renderCarousel();
    fire(track, 'pointerdown', { pointerType: 'touch', button: 0, clientX: 300 });
    fireEvent.click(screen.getByText('B'));
    expect(openSecond).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('ne glisse pas vers une collection quand on tire le carrousel', () => {
    const { openSecond, track } = renderCarousel();
    fire(track, 'pointerdown', { pointerType: 'mouse', button: 0, clientX: 300 });
    fire(track, 'pointermove', { pointerType: 'mouse', clientX: 240, pointerId: 1 });
    fire(track, 'pointerup', { pointerType: 'mouse', clientX: 240, pointerId: 1 });
    fireEvent.click(screen.getByText('B'));
    expect(openSecond).not.toHaveBeenCalled();
  });

  it('ouvre le sachet déjà centré sans appui préalable', () => {
    const { openFirst } = renderCarousel();
    fireEvent.click(screen.getByText('A'));
    expect(openFirst).toHaveBeenCalledTimes(1);
  });
});
