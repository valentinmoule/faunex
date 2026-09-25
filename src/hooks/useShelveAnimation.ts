import { useCallback, useEffect, useRef, useState } from 'react';
import { consumePendingShelve, peekPendingShelve, type PendingShelve } from '@/lib/shelveAnimation';
import { hapticDiscovery } from '@/lib/haptics';

interface Options {
  /** Le catalogue est encore en chargement : on attend avant de jouer l'animation. */
  loading: boolean;
  /** Prépare la vue (ferme collections/territoires, vide les filtres) avant l'animation. */
  onPrepare?: () => void;
  /** Retourne l'élément DOM de la carte cible s'il est monté dans la grille. */
  resolveSlot: (shelve: PendingShelve) => HTMLElement | null;
}

export interface ShelveFlight {
  /** Carte dessinée à sa taille de départ (net), centrée sur l'emplacement cible. */
  style: React.CSSProperties;
  dx: number;
  dy: number;
  endScale: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Animation « la carte se range dans le bestiaire » après une capture.
 * Uniquement des transform/opacity (GPU) via Web Animations : aucun reflow
 * pendant le vol, donc fluide même sur des téléphones modestes.
 */
export const useShelveAnimation = ({ loading, onPrepare, resolveSlot }: Options) => {
  const [pendingShelve, setPendingShelve] = useState<PendingShelve | null>(null);
  const [flight, setFlight] = useState<ShelveFlight | null>(null);
  const [hiddenSlot, setHiddenSlot] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const ran = useRef(false);
  const prepared = useRef(false);

  useEffect(() => {
    const peeked = peekPendingShelve();
    if (peeked) setPendingShelve(peeked);
  }, []);

  useEffect(() => {
    if (!pendingShelve || prepared.current) return;
    prepared.current = true;
    onPrepare?.();
  }, [pendingShelve, onPrepare]);

  // 1. Attendre que la carte cible soit montée, la centrer, mesurer.
  useEffect(() => {
    if (!pendingShelve || ran.current || loading) return;
    let cancelled = false;
    let attempts = 0;
    const timers: number[] = [];

    const finish = () => {
      consumePendingShelve();
      setPendingShelve(null);
    };

    const tryStart = () => {
      if (cancelled) return;
      const slot = resolveSlot(pendingShelve);
      if (!slot) {
        attempts += 1;
        if (attempts < 40) timers.push(window.setTimeout(tryStart, 80));
        else { ran.current = true; finish(); }
        return;
      }
      ran.current = true;
      consumePendingShelve();
      slot.scrollIntoView({ behavior: 'auto', block: 'center' });

      // Deux frames : la virtualisation et le scroll sont stabilisés.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return;
        const live = resolveSlot(pendingShelve) || slot;
        const to = live.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const sw = Math.min(240, vw * 0.6);
        const sh = sw * (to.height / Math.max(to.width, 1));
        const cx = to.left + to.width / 2;
        const cy = to.top + to.height / 2;
        setHiddenSlot(true);
        setFlight({
          style: { left: cx - sw / 2, top: cy - sh / 2, width: sw, height: sh },
          dx: vw / 2 - cx,
          dy: vh / 2 - cy,
          endScale: to.width / sw,
        });
      }));
    };

    timers.push(window.setTimeout(tryStart, 60));
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [pendingShelve, loading, resolveSlot]);

  // 2. Jouer l'animation une fois la carte volante montée.
  useEffect(() => {
    if (!flight) return;
    const card = cardRef.current;
    if (!card) return;
    const backdrop = backdropRef.current;
    const label = labelRef.current;
    const { dx, dy, endScale } = flight;
    const reduced = prefersReducedMotion();
    const anims: Animation[] = [];
    let cancelled = false;

    const at = (x: number, y: number, s: number, r: number) =>
      `translate3d(${x}px, ${y}px, 0) scale(${s}) rotate(${r}deg)`;

    const run = async () => {
      try {
        if (backdrop) {
          anims.push(backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 1 : 320, fill: 'forwards', easing: 'ease-out' }));
        }
        // Apparition : la carte « éclot » au centre avec un léger rebond.
        const reveal = card.animate(
          [
            { transform: at(dx, dy, 0.55, -10), opacity: 0 },
            { transform: at(dx, dy, 1.04, -5), opacity: 1, offset: 0.7 },
            { transform: at(dx, dy, 1, -6), opacity: 1 },
          ],
          { duration: reduced ? 1 : 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
        );
        anims.push(reveal);
        await reveal.finished;
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, reduced ? 0 : 650));
        if (cancelled) return;

        // Vol : trajectoire courbe vers l'emplacement, la carte se redresse.
        const midX = dx * 0.45;
        const midY = dy * 0.45 - 36;
        const midS = 1 - (1 - endScale) * 0.55;
        const fly = card.animate(
          [
            { transform: at(dx, dy, 1, -6) },
            { transform: at(midX, midY, midS, 3), offset: 0.5 },
            { transform: at(0, 0, endScale, 0) },
          ],
          { duration: reduced ? 1 : 820, easing: 'cubic-bezier(0.6, 0, 0.2, 1)', fill: 'forwards' },
        );
        anims.push(fly);
        if (label) anims.push(label.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards', easing: 'ease-in' }));
        if (backdrop) anims.push(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 1 : 700, delay: 200, fill: 'forwards' }));
        await fly.finished;
        if (cancelled) return;

        // Atterrissage : la vraie carte réapparaît sous la volante, puis flash.
        hapticDiscovery();
        setHiddenSlot(false);
        setFlashing(true);
        const out = card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
        anims.push(out);
        await out.finished;
        if (cancelled) return;
        setFlight(null);
        setTimeout(() => {
          setFlashing(false);
          setPendingShelve(null);
        }, 900);
      } catch {
        // Animation annulée (démontage) : on nettoie.
        setHiddenSlot(false);
        setFlight(null);
      }
    };
    run();
    return () => {
      cancelled = true;
      anims.forEach((a) => a.cancel());
    };
  }, [flight]);

  const isTarget = useCallback(
    (name: string, scientific?: string | null) => {
      if (!pendingShelve) return false;
      const sci = pendingShelve.scientificName?.trim().toLowerCase();
      if (sci && scientific && scientific.trim().toLowerCase() === sci) return true;
      return name.toLowerCase() === pendingShelve.animalName.toLowerCase();
    },
    [pendingShelve],
  );

  return {
    pendingShelve,
    flight,
    cardRef,
    backdropRef,
    labelRef,
    isHidden: (name: string, sci?: string | null) => hiddenSlot && isTarget(name, sci),
    isFlashing: (name: string, sci?: string | null) => flashing && isTarget(name, sci),
  };
};
