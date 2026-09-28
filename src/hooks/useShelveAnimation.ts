import { useCallback, useEffect, useRef, useState } from 'react';
import { consumePendingShelve, peekPendingShelve, setShelveRunning, type PendingShelve } from '@/lib/shelveAnimation';
import { hapticDiscovery } from '@/lib/haptics';

interface Options {
  /** Le catalogue est encore en chargement : on attend avant de jouer l'animation. */
  loading: boolean;
  /** La grille a fini de défiler jusqu'à l'emplacement (défaut : true). */
  ready?: boolean;
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
  slot: PendingShelve;
}

/** Attend le décodage sans jamais bloquer le parcours sur un réseau lent. */
const prepareImage = (src: string) => new Promise<void>((resolve) => {
  if (!src) {
    resolve();
    return;
  }
  const image = new Image();
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    resolve();
  };
  const timeout = window.setTimeout(finish, 700);
  image.onload = () => {
    window.clearTimeout(timeout);
    if (typeof image.decode === 'function') image.decode().catch(() => undefined).finally(finish);
    else finish();
  };
  image.onerror = () => {
    window.clearTimeout(timeout);
    finish();
  };
  image.src = src;
  if (image.complete) image.onload?.(new Event('load'));
});

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Animation « la carte se range dans le bestiaire » après une capture.
 * Uniquement des transform/opacity (GPU) via Web Animations : aucun reflow
 * pendant le vol, donc fluide même sur des téléphones modestes.
 */
export const useShelveAnimation = ({ loading, ready = true, onPrepare, resolveSlot }: Options) => {
  const [pendingShelve, setPendingShelve] = useState<PendingShelve | null>(null);
  const [flight, setFlight] = useState<ShelveFlight | null>(null);
  const hiddenSlot = false;
  const flashing = false;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const ran = useRef(false);
  const slotEl = useRef<HTMLElement | null>(null);
  const prepared = useRef(false);

  useEffect(() => {
    const peeked = peekPendingShelve();
    if (peeked) { setShelveRunning(true); setPendingShelve(peeked); }
    return () => setShelveRunning(false);
  }, []);

  useEffect(() => {
    if (!pendingShelve || prepared.current) return;
    prepared.current = true;
    onPrepare?.();
  }, [pendingShelve, onPrepare]);

  // 1. Attendre que la carte cible soit montée, la centrer, mesurer.
  useEffect(() => {
    if (!pendingShelve || ran.current || loading || !ready) return;
    let cancelled = false;
    let attempts = 0;
    const timers: number[] = [];

    const finish = () => {
      consumePendingShelve();
      setShelveRunning(false);
      setPendingShelve(null);
    };

    const tryStart = async () => {
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
      const r0 = slot.getBoundingClientRect();
      if (r0.top < 0 || r0.bottom > window.innerHeight) slot.scrollIntoView({ behavior: 'auto', block: 'center' });

      // La photo doit être décodée avant l'apparition de la carte volante :
      // son chargement ne vient ainsi plus couper la première image du vol.
      await prepareImage(pendingShelve.imageUrl);
      if (cancelled) return;

      // Deux frames : la virtualisation et le scroll sont stabilisés.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return;
        const live = resolveSlot(pendingShelve) || slot;
        const to = live.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const sw = Math.min(240, vw * 0.6);
        const sh = sw * 1.25; // même format que la carte d'attente (4/5)
        const cx = to.left + to.width / 2;
        const cy = to.top + to.height / 2;
        // Masquage direct dans le DOM : pas de re-rendu de toute la grille.
        live.style.visibility = 'hidden';
        slotEl.current = live;
        setFlight({
          style: { left: cx - sw / 2, top: cy - sh / 2, width: sw, height: sh },
          dx: vw / 2 - cx,
          dy: vh / 2 - cy,
          slot: pendingShelve,
        });
      }));
    };

    timers.push(window.setTimeout(tryStart, 60));
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [pendingShelve, loading, ready, resolveSlot]);

  // 2. Jouer l'animation une fois la carte volante montée.
  useEffect(() => {
    if (!flight) return;
    const card = cardRef.current;
    if (!card) return;
    const backdrop = backdropRef.current;
    const label = labelRef.current;
    const { dx, dy } = flight;
    const reduced = prefersReducedMotion();
    const anims: Animation[] = [];
    let cancelled = false;

    const at = (x: number, y: number, sx: number, sy: number, r: number) =>
      `translate3d(${x}px, ${y}px, 0) scale(${sx}, ${sy}) rotate(${r}deg)`;

    // Mesurer la vraie carte (et non la hauteur théorique de la ligne virtuelle).
    // On re-mesure à l'envol : des images/polices ou le scroll peuvent avoir bougé la case.
    const destination = () => {
      const target = resolveSlot(flight.slot);
      if (!target || !target.isConnected) return null;
      const rect = target.getBoundingClientRect();
      const base = flight.style;
      const left = Number(base.left);
      const top = Number(base.top);
      const width = Number(base.width);
      const height = Number(base.height);
      if (!rect.width || !rect.height || !width || !height) return null;
      return {
        x: rect.left + rect.width / 2 - (left + width / 2),
        y: rect.top + rect.height / 2 - (top + height / 2),
        sx: rect.width / width,
        sy: rect.height / height,
      };
    };

    const run = async () => {
      try {
        if (backdrop) {
          // Le voile est déjà visible (posé dès l'arrivée) : on le maintient.
          anims.push(backdrop.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1, fill: 'forwards' }));
        }
        // Un seul mouvement continu : moins de couches et aucune pause entre
        // l'apparition et le rangement, pour rester fluide sur mobile.
        const end = destination();
        if (!end) throw new Error('Shelve slot disappeared');
        // Geste « classeur » : la carte apparaît au centre, se présente, puis
        // glisse dans sa pochette en arrivant légèrement par le haut.
        const preX = end.x;
        const preY = end.y - Math.max(14, 22 * end.sy);
        const soft = 'cubic-bezier(0.22, 1, 0.36, 1)';
        const fly = card.animate(
          [
            // Départ exactement où la carte d'attente était affichée : aucun saut.
            { transform: at(dx, dy, 1, 1, 0), opacity: 1, easing: 'ease-in-out' },
            { transform: at(dx, dy - 4, 1.01, 1.01, 0), opacity: 1, offset: 0.2, easing: soft },
            { transform: at(preX, preY, end.sx * 1.06, end.sy * 1.06, 2), opacity: 1, offset: 0.86, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
            { transform: at(end.x, end.y, end.sx, end.sy, 0), opacity: 1 },
          ],
          { duration: reduced ? 1 : 900, easing: 'linear', fill: 'forwards' },
        );
        anims.push(fly);
        if (label) anims.push(label.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0, offset: 0.62 }, { opacity: 0 }], { duration: reduced ? 1 : 900, fill: 'forwards' }));
        if (backdrop) anims.push(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 1 : 560, delay: reduced ? 0 : 420, fill: 'forwards', easing: 'ease-out' }));
        await fly.finished;
        if (cancelled) return;

        // Si la grille a bougé pendant le vol, ajuster les derniers pixels AVANT
        // de rendre la carte réelle visible, sans saut à l'atterrissage.
        const landing = destination();
        if (landing && (Math.abs(landing.x - end.x) > 0.5 || Math.abs(landing.y - end.y) > 0.5 || Math.abs(landing.sx - end.sx) > 0.005 || Math.abs(landing.sy - end.sy) > 0.005)) {
          const settle = card.animate(
            [{ transform: at(end.x, end.y, end.sx, end.sy, 0) }, { transform: at(landing.x, landing.y, landing.sx, landing.sy, 0) }],
            { duration: reduced ? 1 : 80, easing: 'ease-out', fill: 'forwards' },
          );
          anims.push(settle);
          await settle.finished;
          if (cancelled) return;
        }

        // Atterrissage : la vraie carte réapparaît sous la volante, puis flash.
        hapticDiscovery();
        const landed = resolveSlot(flight.slot) || slotEl.current;
        if (slotEl.current) slotEl.current.style.visibility = '';
        if (landed) {
          landed.style.visibility = '';
          landed.classList.add('shelve-slot-flash');
          window.setTimeout(() => landed.classList.remove('shelve-slot-flash'), 800);
        }
        const out = card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 1 : 100, fill: 'forwards' });
        anims.push(out);
        await out.finished;
        if (cancelled) return;
        setFlight(null);
        setTimeout(() => {
          setShelveRunning(false);
          setPendingShelve(null);
        }, 620);
      } catch {
        // Animation annulée (démontage) : on nettoie.
        if (slotEl.current) slotEl.current.style.visibility = '';
        setFlight(null);
        setShelveRunning(false);
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
      // Plusieurs espèces/races peuvent partager le même binôme : ne pas
      // masquer ni illuminer leurs cases voisines pendant le rangement.
      const sameName = name.trim().toLocaleLowerCase('fr') === pendingShelve.animalName.trim().toLocaleLowerCase('fr');
      if (!sameName) return false;
      const expectedScientific = pendingShelve.scientificName?.trim().toLowerCase();
      const candidateScientific = scientific?.trim().toLowerCase();
      return !expectedScientific || !candidateScientific || expectedScientific === candidateScientific;
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
