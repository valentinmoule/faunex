import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
 * Durée d'affichage du compteur « +XP ». Doit rester calée sur la durée de
 * `shelve-xp-reveal` dans index.css, sinon le compteur est coupé avant la fin
 * de son fondu.
 */
const XP_REWARD_MS = 1800;

/**
 * Animation « la carte se range dans le bestiaire » après une capture.
 * Uniquement des transform/opacity (GPU) via Web Animations : aucun reflow
 * pendant le vol, donc fluide même sur des téléphones modestes.
 */
export const useShelveAnimation = ({ loading, ready = true, onPrepare, resolveSlot }: Options) => {
  const [pendingShelve, setPendingShelve] = useState<PendingShelve | null>(null);
  const [flight, setFlight] = useState<ShelveFlight | null>(null);
  const [xpReward, setXpReward] = useState<{ amount: number } | null>(null);
  const hiddenSlot = false;
  const flashing = false;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const ran = useRef(false);
  const slotEl = useRef<HTMLElement | null>(null);
  const prepared = useRef(false);

  useLayoutEffect(() => {
    if (flight && cardRef.current) window.dispatchEvent(new Event('faunex:shelve-flight'));
  }, [flight]);

  // Le compteur d'XP a sa propre durée de vie : il reste affiché après
  // l'atterrissage de la carte, le temps de jouer tout son fondu.
  useEffect(() => {
    if (!xpReward) return;
    const timer = window.setTimeout(() => setXpReward(null), prefersReducedMotion() ? 1 : XP_REWARD_MS);
    return () => window.clearTimeout(timer);
  }, [xpReward]);

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
        const sw = Math.min(112, vw * 0.28);
        const sh = sw * 1.25; // petite carte qui file directement dans sa case
        const cx = to.left + to.width / 2;
        const cy = to.top + to.height / 2;
        // Masquage direct dans le DOM : pas de re-rendu de toute la grille.
        live.style.visibility = 'hidden';
        slotEl.current = live;
        setFlight({
          style: { left: cx - sw / 2, top: cy - sh / 2, width: sw, height: sh },
          // Départ en bas au centre (là où était l'écran de capture).
          dx: vw / 2 - cx,
          dy: vh - sh / 2 - cy,
          slot: pendingShelve,
        });
        // Le « +XP » démarre avec le vol et lui survit le temps de son animation.
        const xpAmount = pendingShelve.xpGained ?? 0;
        if (xpAmount > 0) setXpReward({ amount: xpAmount });
      }));
    };

    timers.push(window.setTimeout(tryStart, 60));
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [pendingShelve, loading, ready, resolveSlot]);

  // 2. Jouer l'animation une fois la carte volante montée.
  useLayoutEffect(() => {
    if (!flight) return;
    const card = cardRef.current;
    if (!card) return;
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
        // Un seul trajet direct, une seule courbe : la carte file vers sa case.
        const end = destination();
        if (!end) throw new Error('Shelve slot disappeared');
        const fly = card.animate(
          [
            { transform: at(dx, dy, 1, 1, 0), opacity: 1 },
            { transform: at(end.x, end.y, end.sx, end.sy, 0), opacity: 1 },
          ],
          { duration: reduced ? 1 : 480, easing: 'cubic-bezier(0.25, 0.8, 0.3, 1)', fill: 'forwards' },
        );
        anims.push(fly);
        if (label) anims.push(label.animate([{ opacity: 0 }, { opacity: 0 }], { duration: reduced ? 1 : 480, fill: 'forwards' }));
        await fly.finished;
        if (cancelled) return;

        // Atterrissage : la vraie carte, déjà peinte avec la photo optimiste,
        // remplace la volante dans la même frame pour éviter tout trou visuel.
        hapticDiscovery();
        const landed = resolveSlot(flight.slot) || slotEl.current;
        if (slotEl.current) slotEl.current.style.visibility = '';
        if (landed) {
          landed.style.visibility = '';
          landed.classList.add('shelve-slot-flash');
          window.setTimeout(() => landed.classList.remove('shelve-slot-flash'), 800);
        }
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;
        const out = card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 1 : 90, easing: 'linear', fill: 'forwards' });
        anims.push(out);
        await out.finished;
        if (cancelled) return;
        setFlight(null);
        setPendingShelve(null);
        // Laisser le flash de la case démarrer avant la montée de niveau.
        window.setTimeout(() => setShelveRunning(false), reduced ? 1 : 350);
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
    xpReward,
    cardRef,
    labelRef,
    isHidden: (name: string, sci?: string | null) => hiddenSlot && isTarget(name, sci),
    isFlashing: (name: string, sci?: string | null) => flashing && isTarget(name, sci),
  };
};
