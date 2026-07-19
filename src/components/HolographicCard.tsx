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
  const loopRef = useRef<number | null>(null);
  const baselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const warmupRef = useRef<{ count: number; sumBeta: number; sumGamma: number }>({ count: 0, sumBeta: 0, sumGamma: 0 });
  const smoothRef = useRef<{ px: number; py: number; primed: boolean; lastFrame: number }>({ px: 50, py: 50, primed: false, lastFrame: 0 });
  const targetRef = useRef<{ px: number; py: number } | null>(null);
  const filteredRef = useRef<{ beta: number; gamma: number } | null>(null);
  const lastRawRef = useRef<{ beta: number; gamma: number } | null>(null);
  // Adaptive tuning: rolling estimate of sensor dt (ms) and angular velocity (°/s).
  const adaptRef = useRef<{ lastT: number; dt: number; velocity: number; smooth: number }>({ lastT: 0, dt: 16, velocity: 0, smooth: 0.22 });
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
    s.setProperty('--background-y', `${(36 + (py / 100) * 28).toFixed(2)}%`);
    s.setProperty('--rotate-x', `${(-(cx / 6)).toFixed(2)}deg`);
    s.setProperty('--rotate-y', `${(cy / 6).toFixed(2)}deg`);
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
      if (Math.abs(beta - last.beta) > 45 || Math.abs(gamma - last.gamma) > 45) {
        lastRawRef.current = { beta, gamma };
        return;
      }
    }
    // --- Adaptive tuning: measure sensor cadence & angular velocity ---
    const now = performance.now();
    const a = adaptRef.current;
    if (last && a.lastT) {
      const dt = Math.max(1, now - a.lastT);
      // EMA of dt (ms between events) and velocity (°/s combined axes).
      a.dt += (dt - a.dt) * 0.2;
      const dAngle = Math.hypot(beta - last.beta, gamma - last.gamma);
      const v = (dAngle / dt) * 1000;
      a.velocity += (v - a.velocity) * 0.25;
    }
    a.lastT = now;
    lastRawRef.current = { beta, gamma };

    const dtRatio = Math.max(0.6, Math.min(2.2, a.dt / 16.67));
    const filterK = Math.max(0.08, Math.min(0.32, (a.velocity > 80 ? 0.24 : 0.14) * dtRatio));
    if (!filteredRef.current) {
      filteredRef.current = { beta, gamma };
    } else {
      filteredRef.current.beta += (beta - filteredRef.current.beta) * filterK;
      filteredRef.current.gamma += (gamma - filteredRef.current.gamma) * filterK;
    }
    const filtered = filteredRef.current;
    if (!filtered) return;

    // Warm-up: average the first ~16 filtered frames so the baseline reflects the actual
    // resting pose (angle at which the user is holding the phone), not motion.
    if (!baselineRef.current) {
      const w = warmupRef.current;
      w.count += 1;
      w.sumBeta += filtered.beta;
      w.sumGamma += filtered.gamma;
      if (w.count < 16) return;
      baselineRef.current = { beta: w.sumBeta / w.count, gamma: w.sumGamma / w.count };
    }
    const base = baselineRef.current;
    // The holo reflection is a subtle card parallax, not a full-screen pan.
    // Keep movement bounded and soft so normal phone motion cannot create large jumps.
    const RANGE = 34;
    const TRAVEL = 19;
    // Small dead-zone near baseline to filter out micro-shakes.
    const DEAD = 1.8;
    const rawDGamma = filtered.gamma - base.gamma;
    const rawDBeta = filtered.beta - base.beta;
    const applyDeadZone = (value: number) => {
      const abs = Math.abs(value);
      if (abs <= DEAD) return 0;
      return Math.sign(value) * (abs - DEAD);
    };
    const shapeParallax = (value: number) => {
      const normalized = Math.max(-1, Math.min(1, applyDeadZone(value) / RANGE));
      return Math.tanh(normalized * 1.45) / Math.tanh(1.45);
    };
    const dGamma = shapeParallax(rawDGamma);
    const dBeta = shapeParallax(rawDBeta);
    // Recenter only when the phone is almost still; never chase real movement.
    const drift = a.velocity < 7 && Math.hypot(rawDBeta, rawDGamma) < 6 ? 0.002 : 0.00025;
    base.gamma += rawDGamma * drift;
    base.beta += rawDBeta * drift;
    const targetPx = 50 + dGamma * TRAVEL;
    const targetPy = 50 + dBeta * TRAVEL;
    if (!smoothRef.current.primed) {
      smoothRef.current.px = targetPx;
      smoothRef.current.py = targetPy;
      smoothRef.current.primed = true;
      smoothRef.current.lastFrame = performance.now();
      applyVars(targetPx, targetPy, targetPx - 50, targetPy - 50);
    }
    targetRef.current = { px: targetPx, py: targetPy };
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

    // Continuous rAF loop with adaptive smoothing:
    //  - Slow sensor cadence (dt ↑) → interpolate more per frame so we don't lag.
    //  - Low angular velocity → strong low-pass to kill jitter at rest.
    //  - High velocity → lighter filter for a snappy response.
    const tick = () => {
      const t = targetRef.current;
      if (t && !pausedRef.current) {
        const s = smoothRef.current;
        const a = adaptRef.current;
        const now = performance.now();
        const frameDt = s.lastFrame ? Math.min(48, now - s.lastFrame) : 16.67;
        s.lastFrame = now;
        // Time-based damping keeps the same feel on 60/90/120Hz screens.
        const still = a.velocity < 7;
        const responseMs = still ? 220 : a.velocity > 120 ? 105 : 155;
        const target = 1 - Math.exp(-frameDt / responseMs);
        a.smooth += (target - a.smooth) * 0.08;
        const k = Math.max(0.045, Math.min(0.22, a.smooth));
        const dx = t.px - s.px;
        const dy = t.py - s.py;
        const maxStep = Math.max(0.28, Math.min(1.8, (still ? 0.55 : 0.95 + a.velocity / 260) * (frameDt / 16.67)));
        s.px += Math.max(-maxStep, Math.min(maxStep, dx * k));
        s.py += Math.max(-maxStep, Math.min(maxStep, dy * k));
        applyVars(s.px, s.py, s.px - 50, s.py - 50);
      }
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('deviceorientation', handler);
      if (loopRef.current != null) cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
      baselineRef.current = null;
      warmupRef.current = { count: 0, sumBeta: 0, sumGamma: 0 };
      lastRawRef.current = null;
      filteredRef.current = null;
      smoothRef.current = { px: 50, py: 50, primed: false, lastFrame: 0 };
      targetRef.current = null;
      reset();
    };
  }, [noHolo, updateFromOrientation, reset, applyVars]);

  // Sync paused state and rebaseline whenever we resume so the resting pose recalibrates.
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      reset();
    } else {
      baselineRef.current = null;
      warmupRef.current = { count: 0, sumBeta: 0, sumGamma: 0 };
      lastRawRef.current = null;
      filteredRef.current = null;
      smoothRef.current = { px: 50, py: 50, primed: false, lastFrame: 0 };
      targetRef.current = null;
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
