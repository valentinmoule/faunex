import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { type Rarity } from '@/data/mockData';

interface Props {
  rarity: Rarity;
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  appearAnimation?: string;
  /** AI-generated transparent PNG of the animal — rendered ON TOP of the holo effects. */
  cutoutUrl?: string | null;
  /** Approximate normalized (0..1) bounding box of the animal — holo effects are masked around it. */
  subjectBox?: { x: number; y: number; w: number; h: number } | null;
  /** Keep pointer/touch gestures inside the card (used by fullscreen overlays). */
  containInteraction?: boolean;
  /** Disable holo shine/glare/cutout/tilt entirely (e.g. uncaptured silhouettes). */
  noHolo?: boolean;
  /** Temporarily freeze holo tilt updates (e.g. during pinch-zoom). Rebaselines on resume. */
  paused?: boolean;
  /** Kept for API compatibility (unused). */
  disableAutoShimmer?: boolean;
}

/**
 * Faunex collectible card — inspired by simeydotme/pokemon-cards-css.
 *
 * Rarity → effect mapping:
 *   common → Holofoil Rare (scanlines + chromatic bars)
 *   rare   → Reverse Holo (radial foil tracking the pointer)
 *   epic   → Cosmos / Galaxy Holo (multi-layer galaxy texture)
 *   mythic → Secret Rare (gold conic + glitter)
 *
 * Pointer drives 3D tilt + reflet (mouse + touch). On leave, everything snaps back.
 */
const HolographicCard = ({
  rarity,
  children,
  className = '',
  onTap,
  appearAnimation = '',
  cutoutUrl,
  subjectBox,
  containInteraction = false,
  noHolo = false,
  paused = false,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const baselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const warmupRef = useRef<{ count: number; sumBeta: number; sumGamma: number }>({ count: 0, sumBeta: 0, sumGamma: 0 });
  const smoothRef = useRef<{ px: number; py: number; primed: boolean }>({ px: 50, py: 50, primed: false });
  const lastRawRef = useRef<{ beta: number; gamma: number } | null>(null);
  const pausedRef = useRef(paused);

  const applyVars = useCallback((px: number, py: number, cx: number, cy: number) => {
    const node = wrapRef.current;
    if (!node) return;
    const fromCenter = Math.min(1, Math.hypot(cx, cy) / 50);
    const s = node.style;
    s.setProperty('--pointer-x', `${px}%`);
    s.setProperty('--pointer-y', `${py}%`);
    s.setProperty('--pointer-from-center', `${fromCenter.toFixed(3)}`);
    s.setProperty('--pointer-from-top', `${(py / 100).toFixed(3)}`);
    s.setProperty('--pointer-from-left', `${(px / 100).toFixed(3)}`);
    s.setProperty('--background-x', `${(37 + (px / 100) * 26).toFixed(2)}%`);
    s.setProperty('--background-y', `${(33 + (py / 100) * 34).toFixed(2)}%`);
    s.setProperty('--rotate-x', `${(-(cx / 3.5)).toFixed(2)}deg`);
    s.setProperty('--rotate-y', `${(cy / 3.5).toFixed(2)}deg`);
    s.setProperty('--card-opacity', '1');
  }, []);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => {
      rafRef.current = null;
      const node = wrapRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const py = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      applyVars(px, py, px - 50, py - 50);
    };
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(apply);
  }, [applyVars]);

  // Gyroscope-driven update. beta = front/back tilt (-180..180), gamma = left/right (-90..90).
  const updateFromOrientation = useCallback((beta: number | null, gamma: number | null) => {
    if (beta == null || gamma == null) return;
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;

    // Reject wild jumps (device flipping, angle wrap at ±180) — likely garbage frames.
    const last = lastRawRef.current;
    if (last) {
      if (Math.abs(beta - last.beta) > 60 || Math.abs(gamma - last.gamma) > 60) {
        lastRawRef.current = { beta, gamma };
        return;
      }
    }
    lastRawRef.current = { beta, gamma };

    // Warm-up: average the first few frames so the baseline reflects the resting pose,
    // not whatever motion was happening at mount time.
    if (!baselineRef.current) {
      const w = warmupRef.current;
      w.count += 1;
      w.sumBeta += beta;
      w.sumGamma += gamma;
      if (w.count < 4) return;
      baselineRef.current = { beta: w.sumBeta / w.count, gamma: w.sumGamma / w.count };
    }
    const base = baselineRef.current;
    const RANGE = 45;
    const dGamma = Math.max(-RANGE, Math.min(RANGE, gamma - base.gamma));
    const dBeta = Math.max(-RANGE, Math.min(RANGE, beta - base.beta));
    const targetPx = 50 + (dGamma / RANGE) * 50;
    const targetPy = 50 + (dBeta / RANGE) * 50;
    // Prime on first valid frame to avoid a slow drift-in from (50,50).
    if (!smoothRef.current.primed) {
      smoothRef.current.px = targetPx;
      smoothRef.current.py = targetPy;
      smoothRef.current.primed = true;
    } else {
      const SMOOTH = 0.12;
      smoothRef.current.px += (targetPx - smoothRef.current.px) * SMOOTH;
      smoothRef.current.py += (targetPy - smoothRef.current.py) * SMOOTH;
    }
    const px = smoothRef.current.px;
    const py = smoothRef.current.py;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        applyVars(px, py, px - 50, py - 50);
      });
    }
  }, [applyVars]);

  const reset = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const el = wrapRef.current;
    if (!el) return;
    const s = el.style;
    s.setProperty('--pointer-x', '50%');
    s.setProperty('--pointer-y', '50%');
    s.setProperty('--pointer-from-center', '0');
    s.setProperty('--pointer-from-top', '0.5');
    s.setProperty('--pointer-from-left', '0.5');
    s.setProperty('--background-x', '50%');
    s.setProperty('--background-y', '50%');
    s.setProperty('--rotate-x', '0deg');
    s.setProperty('--rotate-y', '0deg');
    s.setProperty('--card-opacity', '0');
  }, []);

  const containEvent = useCallback((event: { stopPropagation: () => void; preventDefault?: () => void; cancelable?: boolean }) => {
    if (!containInteraction) return;
    event.stopPropagation();
    if (event.cancelable) event.preventDefault?.();
  }, [containInteraction]);

  // Attach gyroscope listener while the card is mounted.
  useEffect(() => {
    if (noHolo) return;
    if (typeof window === 'undefined') return;

    const handler = (e: DeviceOrientationEvent) => {
      if (pausedRef.current) return;
      updateFromOrientation(e.beta, e.gamma);
    };

    let attached = false;
    const attach = () => {
      if (attached) return;
      window.addEventListener('deviceorientation', handler, { passive: true });
      attached = true;
    };

    const RequestPerm = (window as any).DeviceOrientationEvent?.requestPermission;
    if (typeof RequestPerm === 'function') {
      // iOS 13+: needs a user gesture to request permission.
      const askOnce = () => {
        RequestPerm().then((state: string) => {
          if (state === 'granted') attach();
        }).catch(() => {});
        window.removeEventListener('touchend', askOnce);
        window.removeEventListener('click', askOnce);
      };
      window.addEventListener('touchend', askOnce, { once: true, passive: true });
      window.addEventListener('click', askOnce, { once: true });
    } else {
      attach();
    }

    return () => {
      window.removeEventListener('deviceorientation', handler);
      baselineRef.current = null;
      warmupRef.current = { count: 0, sumBeta: 0, sumGamma: 0 };
      lastRawRef.current = null;
      smoothRef.current = { px: 50, py: 50, primed: false };
      reset();
    };
  }, [noHolo, updateFromOrientation, reset]);

  // Sync paused state and rebaseline whenever we resume so the resting pose recalibrates.
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      reset();
    } else {
      baselineRef.current = null;
      warmupRef.current = { count: 0, sumBeta: 0, sumGamma: 0 };
      lastRawRef.current = null;
      smoothRef.current = { px: 50, py: 50, primed: false };
    }
  }, [paused, reset]);




  // Random cosmos position per card so two epics never look identical
  const cosmosStyle = useMemo(
    () => {
      const base: React.CSSProperties = {
        ['--cosmos-x' as any]: `${Math.floor(Math.random() * 734)}px`,
        ['--cosmos-y' as any]: `${Math.floor(Math.random() * 1280)}px`,
      };
      if (subjectBox) {
        const cx = (subjectBox.x + subjectBox.w / 2) * 100;
        const cy = (subjectBox.y + subjectBox.h / 2) * 100;
        // Inflate radii slightly so the holo fades softly around the subject.
        const rx = Math.min(95, (subjectBox.w / 2) * 100 * 1.15);
        const ry = Math.min(95, (subjectBox.h / 2) * 100 * 1.15);
        (base as any)['--subj-cx'] = `${cx.toFixed(2)}%`;
        (base as any)['--subj-cy'] = `${cy.toFixed(2)}%`;
        (base as any)['--subj-rx'] = `${rx.toFixed(2)}%`;
        (base as any)['--subj-ry'] = `${ry.toFixed(2)}%`;
      }
      return base;
    },
    [subjectBox],
  );

  if (noHolo) {
    return (
      <div
        className={`holo-wrap holo-no-fx ${className} ${appearAnimation}`}
        onClick={(e) => { if (containInteraction) e.stopPropagation(); onTap?.(); }}
        role={onTap ? 'button' : undefined}
        tabIndex={onTap ? 0 : undefined}
      >
        <div className="holo-rotator">
          <div className="holo-card">
            <div className="holo-content">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`holo-wrap holo-${rarity} ${className} ${appearAnimation}`}
      data-subject={subjectBox ? 'on' : undefined}
      style={cosmosStyle}
      onMouseMove={(e) => updateFromPointer(e.clientX, e.clientY)}
      onMouseLeave={reset}
      onClick={(e) => {
        if (containInteraction) e.stopPropagation();
        onTap?.();
      }}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
    >
      <div className="holo-rotator">
        <div className="holo-card">
          <div className="holo-content">{children}</div>
          {cutoutUrl && (
            <div className="holo-cutout" aria-hidden>
              <img src={cutoutUrl} alt="" loading="eager" decoding="async" draggable={false} />
            </div>
          )}
          <div className="holo-shine" aria-hidden />
          <div className="holo-glare" aria-hidden />
        </div>
      </div>
    </div>
  );
};

export default HolographicCard;
