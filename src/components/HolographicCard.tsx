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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const angleDelta = (value: number, origin: number) => {
  let diff = value - origin;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
};

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
  const adaptRef = useRef<{ lastT: number; dt: number; velocity: number; responseMs: number }>({ lastT: 0, dt: 16, velocity: 0, responseMs: 150 });
  const lastAppliedRef = useRef<{ px: number; py: number; opacity: number }>({ px: 50, py: 50, opacity: 0 });
  const pausedRef = useRef(paused);

  const applyVars = useCallback((px: number, py: number, cx: number, cy: number) => {
    const node = wrapRef.current;
    if (!node) return;
    const last = lastAppliedRef.current;
    const opacity = 1;
    if (
      Math.abs(px - last.px) < 0.015 &&
      Math.abs(py - last.py) < 0.015 &&
      last.opacity === opacity
    ) return;
    lastAppliedRef.current = { px, py, opacity };
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
    s.setProperty('--card-opacity', String(opacity));
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

    // --- Adaptive tuning: measure sensor cadence & angular velocity ---
    const now = performance.now();
    const a = adaptRef.current;
    const last = lastRawRef.current;
    let safeBeta = beta;
    let safeGamma = gamma;
    let dt = a.dt || 16.67;
    if (last && a.lastT) {
      dt = clamp(now - a.lastT, 8, 80);
      // Clamp impossible sensor spikes instead of dropping a frame entirely: dropping
      // keeps a stale target, then the next valid frame visibly snaps the effect.
      const maxDelta = clamp(dt * 0.42, 4.5, 18);
      const dBeta = clamp(angleDelta(beta, last.beta), -maxDelta, maxDelta);
      const dGamma = clamp(gamma - last.gamma, -maxDelta, maxDelta);
      safeBeta = last.beta + dBeta;
      safeGamma = last.gamma + dGamma;

      // EMA of dt (ms between events) and angular velocity (°/s combined axes).
      a.dt += (dt - a.dt) * 0.18;
      const v = (Math.hypot(dBeta, dGamma) / dt) * 1000;
      a.velocity += (v - a.velocity) * 0.18;
    }
    a.lastT = now;
    lastRawRef.current = { beta: safeBeta, gamma: safeGamma };

    const filterMs = a.velocity < 8 ? 150 : a.velocity > 120 ? 72 : 105;
    const filterK = clamp(1 - Math.exp(-dt / filterMs), 0.045, 0.38);
    if (!filteredRef.current) {
      filteredRef.current = { beta: safeBeta, gamma: safeGamma };
    } else {
      filteredRef.current.beta += angleDelta(safeBeta, filteredRef.current.beta) * filterK;
      filteredRef.current.gamma += (safeGamma - filteredRef.current.gamma) * filterK;
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
      if (w.count < 12) return;
      baselineRef.current = { beta: w.sumBeta / w.count, gamma: w.sumGamma / w.count };
    }
    const base = baselineRef.current;
    // The holo reflection is a subtle card parallax, not a full-screen pan.
    // Keep movement bounded and soft so normal phone motion cannot create large jumps.
    const RANGE_X = 23;
    const RANGE_Y = 25;
    const TRAVEL_X = 34;
    const TRAVEL_Y = 31;
    // Small dead-zone near baseline to filter out micro-shakes.
    const DEAD = 1.15;
    const rawDGamma = filtered.gamma - base.gamma;
    const rawDBeta = angleDelta(filtered.beta, base.beta);
    const applyDeadZone = (value: number) => {
      const abs = Math.abs(value);
      if (abs <= DEAD) return 0;
      return Math.sign(value) * (abs - DEAD);
    };
    const shapeParallax = (value: number, range: number) => {
      const normalized = clamp(applyDeadZone(value) / range, -1, 1);
      return Math.tanh(normalized * 1.45) / Math.tanh(1.45);
    };
    const dGamma = shapeParallax(rawDGamma, RANGE_X);
    const dBeta = shapeParallax(rawDBeta, RANGE_Y);
    // Recenter only when the phone is almost still; never chase real movement.
    const drift = a.velocity < 5 && Math.hypot(rawDBeta, rawDGamma) < 5 ? 0.0012 : 0;
    base.gamma += rawDGamma * drift;
    base.beta += rawDBeta * drift;
    const targetPx = 50 + dGamma * TRAVEL_X;
    const targetPy = 50 + dBeta * TRAVEL_Y;
    if (!smoothRef.current.primed) {
      smoothRef.current.px = targetPx;
      smoothRef.current.py = targetPy;
      smoothRef.current.primed = true;
      smoothRef.current.lastFrame = performance.now();
      applyVars(targetPx, targetPy, targetPx - 50, targetPy - 50);
    }
    targetRef.current = { px: targetPx, py: targetPy };
  }, [applyVars]);

  const resetTracking = useCallback(() => {
    baselineRef.current = null;
    warmupRef.current = { count: 0, sumBeta: 0, sumGamma: 0 };
    lastRawRef.current = null;
    filteredRef.current = null;
    adaptRef.current = { lastT: 0, dt: 16, velocity: 0, responseMs: 150 };
    smoothRef.current = { px: 50, py: 50, primed: false, lastFrame: 0 };
    targetRef.current = null;
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const el = wrapRef.current;
    if (!el) return;
    const s = el.style;
    lastAppliedRef.current = { px: 50, py: 50, opacity: 0 };
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

    // Continuous rAF loop with time-based damping. Sensor events can arrive at
    // irregular frequencies, so CSS vars are updated from this stable render loop.
    const tick = () => {
      const t = targetRef.current;
      if (t && !pausedRef.current) {
        const s = smoothRef.current;
        const a = adaptRef.current;
        const now = performance.now();
        const frameDt = s.lastFrame ? clamp(now - s.lastFrame, 8, 34) : 16.67;
        s.lastFrame = now;
        const desiredResponse = a.velocity < 8 ? 185 : a.velocity > 120 ? 82 : 120;
        a.responseMs += (desiredResponse - a.responseMs) * 0.08;
        const k = clamp(1 - Math.exp(-frameDt / a.responseMs), 0.035, 0.32);
        const dx = t.px - s.px;
        const dy = t.py - s.py;
        s.px += dx * k;
        s.py += dy * k;
        if (Math.abs(dx) < 0.018) s.px = t.px;
        if (Math.abs(dy) < 0.018) s.py = t.py;
        applyVars(s.px, s.py, s.px - 50, s.py - 50);
      }
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('deviceorientation', handler);
      if (loopRef.current != null) cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
      resetTracking();
      reset();
    };
  }, [noHolo, updateFromOrientation, reset, applyVars, resetTracking]);

  // Sync paused state and rebaseline whenever we resume so the resting pose recalibrates.
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      reset();
    } else {
      resetTracking();
    }
  }, [paused, reset, resetTracking]);




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
      data-paused={paused ? 'true' : undefined}
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
