import { RefObject, useEffect } from 'react';

/** Réglages de l'effet de profondeur au défilement (discret par design). */
const MAX_SCALE = 0.045; // ±4,5 % aux extrémités de l'écran
const MAX_TILT = 7; // degrés d'inclinaison 3D
const MAX_DEPTH = 26; // px de recul / d'avancée
const PERSPECTIVE = 900;
const SPEED_FOR_FULL = 2.6; // px/ms pour atteindre l'intensité maximale
const STIFFNESS = 190; // ressort : retour élastique à l'arrêt
const DAMPING = 15;
const IDLE_MS = 90;

/** Transform d'une carte selon sa position verticale (-1 haut … 1 bas) et l'intensité. */
export function depthTransform(position: number, intensity: number): string {
  const p = Math.max(-1.2, Math.min(1.2, position));
  const k = intensity * p;
  const scale = 1 + MAX_SCALE * k;
  const z = MAX_DEPTH * k;
  const tilt = -MAX_TILT * k;
  return `perspective(${PERSPECTIVE}px) translate3d(0,0,${z.toFixed(2)}px) rotateX(${tilt.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
}

/**
 * Pendant le défilement de la fenêtre, les cartes du haut reculent et
 * rétrécissent, celles du bas avancent et grossissent ; l'intensité suit la
 * vitesse et revient avec un léger rebond. Seul `transform` est écrit : la
 * mise en page et le défilement natif ne sont jamais touchés.
 */
export function useScrollDepth(containerRef: RefObject<HTMLElement>, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let lastScrollAt = 0;
    let speed = 0; // px/ms lissé
    let intensity = 0;
    let intensityV = 0;
    let painted = false;

    const items = () =>
      containerRef.current
        ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-depth-item]'))
        : [];

    const reset = () => {
      for (const el of items()) {
        el.style.transform = '';
        el.style.willChange = '';
      }
      painted = false;
    };

    const tick = (now: number) => {
      frame = 0;
      const dt = Math.max(1, Math.min(64, now - lastT));
      lastT = now;
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      // Saut programmatique (rangement, retour en haut) : pas d'effet.
      const inst = Math.abs(dy) > window.innerHeight * 0.8 ? 0 : dy / dt;
      speed = speed * 0.78 + inst * 0.22;

      const idle = now - lastScrollAt > IDLE_MS;
      const target = idle ? 0 : Math.min(1, Math.abs(speed) / SPEED_FOR_FULL);
      const s = dt / 1000;
      intensityV += (STIFFNESS * (target - intensity) - DAMPING * intensityV) * s;
      intensity += intensityV * s;

      const settled = idle && Math.abs(intensity) < 0.002 && Math.abs(intensityV) < 0.01;
      if (settled) {
        intensity = 0;
        intensityV = 0;
        speed = 0;
        if (painted) reset();
        return;
      }

      const list = items();
      const half = window.innerHeight / 2;
      // Lecture groupée puis écriture : le centre d'une carte ne bouge pas avec
      // son transform (échelle et rotation autour du centre).
      const positions = list.map((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom < -100 || r.top > window.innerHeight + 100 ? null : (r.top + r.height / 2 - half) / half;
      });
      list.forEach((el, i) => {
        const p = positions[i];
        if (p == null) return;
        el.style.willChange = 'transform';
        el.style.transform = depthTransform(p, intensity);
      });
      painted = true;
      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      lastScrollAt = performance.now();
      if (!frame) {
        lastT = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
      reset();
    };
  }, [containerRef, enabled]);
}
