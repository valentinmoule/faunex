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
  /** Freeze the effect (e.g. while pinch-zooming). Recalibrates the gyro on resume. */
  paused?: boolean;
  /** Kept for API compatibility (unused). */
  disableAutoShimmer?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const round = (value: number, precision = 2) => {
  const p = 10 ** precision;
  return Math.round(value * p) / p;
};

const angleDelta = (value: number, origin: number) => {
  let diff = value - origin;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
};

/** Critically-damped spring — identical model for every rarity and every size. */
interface Spring {
  value: number;
  target: number;
  velocity: number;
}

const makeSpring = (value: number): Spring => ({ value, target: value, velocity: 0 });

const STIFFNESS = 130; // rad²/s² — snappy but never overshoots visibly
const DAMPING = 2 * Math.sqrt(STIFFNESS) * 1.02; // ~critical damping

/** Integrate a spring with fixed 1/120s substeps → frame-rate independent, no jitter. */
const stepSpring = (spring: Spring, dtSeconds: number) => {
  let remaining = Math.min(dtSeconds, 0.064);
  const h = 1 / 120;
  while (remaining > 0) {
    const step = Math.min(h, remaining);
    remaining -= step;
    const accel = (spring.target - spring.value) * STIFFNESS - spring.velocity * DAMPING;
    spring.velocity += accel * step;
    spring.value += spring.velocity * step;
  }
  if (Math.abs(spring.target - spring.value) < 0.001 && Math.abs(spring.velocity) < 0.01) {
    spring.value = spring.target;
    spring.velocity = 0;
  }
};

/**
 * Faunex collectible card — direct port of the rendering model used by
 * simeydotme/pokemon-cards-css.
 *
 * A single spring-driven pointer position (0..100 on both axes) feeds every CSS
 * variable. There is exactly ONE render path: the card in the detail view and
 * the fullscreen photo use the same maths, the same layers and the same
 * compositing, so the effect can never desynchronise between the two.
 *
 * Input: gyroscope on mobile (deviceorientation), mouse on desktop.
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
  const loopRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  const activeRef = useRef(false);

  // Spring state — x/y are pointer coordinates in card space (0..100).
  const springsRef = useRef({ x: makeSpring(50), y: makeSpring(50), opacity: makeSpring(0) });
  const lastFrameRef = useRef(0);
  const dirtyRef = useRef(true);

  // Gyro calibration state.
  const baselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const warmupRef = useRef({ count: 0, beta: 0, gamma: 0 });
  const filteredRef = useRef<{ beta: number; gamma: number } | null>(null);
  const lastEventRef = useRef(0);

  const writeVars = useCallback(() => {
    const node = wrapRef.current;
    if (!node) return;
    const { x, y, opacity } = springsRef.current;
    const px = x.value;
    const py = y.value;
    const centerX = px - 50;
    const centerY = py - 50;
    const fromCenter = clamp(Math.hypot(centerY, centerX) / 50, 0, 1);

    const s = node.style;
    s.setProperty('--pointer-x', `${round(px)}%`);
    s.setProperty('--pointer-y', `${round(py)}%`);
    s.setProperty('--pointer-from-center', `${round(fromCenter, 3)}`);
    s.setProperty('--pointer-from-top', `${round(py / 100, 3)}`);
    s.setProperty('--pointer-from-left', `${round(px / 100, 3)}`);
    // Same mapping as the reference project: 0..100 → 37..63 %
    s.setProperty('--background-x', `${round(37 + (px / 100) * 26)}%`);
    s.setProperty('--background-y', `${round(33 + (py / 100) * 34)}%`);
    s.setProperty('--rotate-x', `${round(-(centerX / 3.5))}deg`);
    s.setProperty('--rotate-y', `${round(centerY / 3.5)}deg`);
    s.setProperty('--card-opacity', `${round(opacity.value, 3)}`);
  }, []);

  const setTarget = useCallback((px: number, py: number, opacity: number) => {
    const sp = springsRef.current;
    sp.x.target = clamp(px, 0, 100);
    sp.y.target = clamp(py, 0, 100);
    sp.opacity.target = opacity;
    dirtyRef.current = true;
  }, []);

  const snapTo = useCallback((px: number, py: number, opacity: number) => {
    const sp = springsRef.current;
    sp.x = makeSpring(px);
    sp.y = makeSpring(py);
    sp.opacity.value = opacity;
    sp.opacity.target = opacity;
    sp.opacity.velocity = 0;
    dirtyRef.current = true;
  }, []);

  const resetCalibration = useCallback(() => {
    baselineRef.current = null;
    warmupRef.current = { count: 0, beta: 0, gamma: 0 };
    filteredRef.current = null;
    lastEventRef.current = 0;
  }, []);

  // ── Pointer (desktop) ───────────────────────────────────────────────
  const handlePointer = useCallback((clientX: number, clientY: number) => {
    const node = wrapRef.current;
    if (!node || pausedRef.current) return;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    activeRef.current = true;
    setTarget(((clientX - rect.left) / rect.width) * 100, ((clientY - rect.top) / rect.height) * 100, 1);
  }, [setTarget]);

  const handleLeave = useCallback(() => {
    activeRef.current = false;
    setTarget(50, 50, 0);
  }, [setTarget]);

  // ── Gyroscope (mobile) ──────────────────────────────────────────────
  const handleOrientation = useCallback((beta: number | null, gamma: number | null) => {
    if (pausedRef.current) return;
    if (beta == null || gamma == null) return;
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return;

    const now = performance.now();
    const dt = lastEventRef.current ? clamp(now - lastEventRef.current, 4, 100) : 16;
    lastEventRef.current = now;

    // Light low-pass on the raw sensor: removes hand tremor without adding lag.
    const k = clamp(1 - Math.exp(-dt / 40), 0.05, 0.6);
    if (!filteredRef.current) {
      filteredRef.current = { beta, gamma };
    } else {
      filteredRef.current.beta += angleDelta(beta, filteredRef.current.beta) * k;
      filteredRef.current.gamma += angleDelta(gamma, filteredRef.current.gamma) * k;
    }
    const filtered = filteredRef.current;

    // Calibrate on the resting pose (average of the first frames).
    if (!baselineRef.current) {
      const w = warmupRef.current;
      w.count += 1;
      w.beta += filtered.beta;
      w.gamma += filtered.gamma;
      if (w.count < 8) return;
      baselineRef.current = { beta: w.beta / w.count, gamma: w.gamma / w.count };
      snapTo(50, 50, 0);
    }

    const base = baselineRef.current;
    const RANGE = 22; // degrees of tilt that map to the full effect travel
    const dGamma = clamp(angleDelta(filtered.gamma, base.gamma) / RANGE, -1, 1);
    const dBeta = clamp(angleDelta(filtered.beta, base.beta) / RANGE, -1, 1);

    activeRef.current = true;
    setTarget(50 + dGamma * 50, 50 + dBeta * 50, 1);
  }, [setTarget, snapTo]);

  // ── Render loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (noHolo || typeof window === 'undefined') return;

    const orientationHandler = (e: DeviceOrientationEvent) => handleOrientation(e.beta, e.gamma);

    let attached = false;
    const attach = () => {
      if (attached) return;
      window.addEventListener('deviceorientation', orientationHandler, { passive: true });
      attached = true;
    };

    const RequestPerm = (window as any).DeviceOrientationEvent?.requestPermission;
    let askOnce: (() => void) | null = null;
    if (typeof RequestPerm === 'function') {
      askOnce = () => {
        RequestPerm()
          .then((state: string) => { if (state === 'granted') attach(); })
          .catch(() => {});
      };
      window.addEventListener('touchend', askOnce, { once: true, passive: true });
      window.addEventListener('click', askOnce, { once: true });
    } else {
      attach();
    }

    const tick = (now: number) => {
      loopRef.current = requestAnimationFrame(tick);
      const dt = lastFrameRef.current ? (now - lastFrameRef.current) / 1000 : 1 / 60;
      lastFrameRef.current = now;
      if (!dirtyRef.current) return;
      const sp = springsRef.current;
      stepSpring(sp.x, dt);
      stepSpring(sp.y, dt);
      stepSpring(sp.opacity, dt);
      writeVars();
      dirtyRef.current =
        sp.x.value !== sp.x.target || sp.y.value !== sp.y.target || sp.opacity.value !== sp.opacity.target;
    };
    loopRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('deviceorientation', orientationHandler);
      if (askOnce) {
        window.removeEventListener('touchend', askOnce);
        window.removeEventListener('click', askOnce);
      }
      if (loopRef.current != null) cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
      lastFrameRef.current = 0;
      resetCalibration();
    };
  }, [noHolo, handleOrientation, writeVars, resetCalibration]);

  // Pause / resume: fade out flat, then recalibrate the resting pose on resume.
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      activeRef.current = false;
      setTarget(50, 50, 0);
    } else {
      resetCalibration();
      snapTo(50, 50, 0);
    }
  }, [paused, setTarget, snapTo, resetCalibration]);

  // Random cosmos position per card so two epics never look identical.
  const cosmosStyle = useMemo(() => {
    const base: React.CSSProperties = {
      ['--cosmos-x' as any]: `${Math.floor(Math.random() * 734)}px`,
      ['--cosmos-y' as any]: `${Math.floor(Math.random() * 1280)}px`,
    };
    if (subjectBox) {
      const cx = (subjectBox.x + subjectBox.w / 2) * 100;
      const cy = (subjectBox.y + subjectBox.h / 2) * 100;
      const rx = Math.min(95, (subjectBox.w / 2) * 100 * 1.15);
      const ry = Math.min(95, (subjectBox.h / 2) * 100 * 1.15);
      (base as any)['--subj-cx'] = `${cx.toFixed(2)}%`;
      (base as any)['--subj-cy'] = `${cy.toFixed(2)}%`;
      (base as any)['--subj-rx'] = `${rx.toFixed(2)}%`;
      (base as any)['--subj-ry'] = `${ry.toFixed(2)}%`;
    }
    return base;
  }, [subjectBox]);

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
      data-cutout={cutoutUrl ? 'on' : undefined}
      data-paused={paused ? 'true' : undefined}
      style={cosmosStyle}
      onMouseMove={(e) => handlePointer(e.clientX, e.clientY)}
      onMouseLeave={handleLeave}
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
