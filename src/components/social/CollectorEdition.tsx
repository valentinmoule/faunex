import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useContestWinnerCutouts } from '@/hooks/usePhotoContest';

/** Gold « ✦ W » symbol shown next to the species name on collector edition cards. */
export function CollectorEditionMark({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      role="img"
      aria-label={t('social.contest.badge')}
      title={t('social.contest.badge')}
      className={`collector-mark pointer-events-none ${className}`}
    >
      <span aria-hidden="true">✦</span>
      <span aria-hidden="true">W</span>
    </span>
  );
}

/** Reflections are rendered with the silhouette so the animal is always excluded. */
export function CollectorHoloLayers() {
  return null;
}

/** AI-detected animal silhouette used as a mask: golden aura + depth shadow, photo stays intact. */
type Placement = { x: number; y: number; width: number; height: number };
const placements = new Map<string, Placement>();

/** Match the AI silhouette's recropped canvas to the unchanged source photo. */
async function locateSilhouette(photoUrl: string, maskUrl: string): Promise<Placement> {
  const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
  const [photo, mask] = await Promise.all([load(photoUrl), load(maskUrl)]);
  const size = 96;
  const pixels = (image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size).data;
  };
  const source = pixels(photo), subject = pixels(mask);
  const samples: { x: number; y: number; r: number; g: number; b: number }[] = [];
  for (let y = 4; y < size; y += 6) for (let x = 4; x < size; x += 6) {
    const i = (y * size + x) * 4;
    if (subject[i + 3] > 240) samples.push({ x: x / size, y: y / size, r: subject[i], g: subject[i + 1], b: subject[i + 2] });
  }
  if (samples.length < 8) throw new Error('No silhouette');
  const means = [0, 0, 0];
  for (const s of samples) { means[0] += s.r; means[1] += s.g; means[2] += s.b; }
  for (let c = 0; c < 3; c++) means[c] /= samples.length;
  const subjectVariance = [0, 0, 0];
  for (const s of samples) {
    s.r -= means[0]; s.g -= means[1]; s.b -= means[2];
    subjectVariance[0] += s.r ** 2; subjectVariance[1] += s.g ** 2; subjectVariance[2] += s.b ** 2;
  }
  let best = { x: 0, y: 0, width: 1, height: 1 }, score = Infinity;
  const ratio = (mask.naturalHeight / mask.naturalWidth) / (photo.naturalHeight / photo.naturalWidth);
  const search = (minScale: number, maxScale: number, minX: number, maxX: number, minY: number, maxY: number, step: number) => {
    for (let scale = minScale; scale <= maxScale; scale += step) {
      const height = scale * ratio;
      for (let y = minY; y <= Math.min(maxY, 1 - height); y += step) for (let x = minX; x <= Math.min(maxX, 1 - scale); x += step) {
        const sums = [0, 0, 0], squares = [0, 0, 0], covariance = [0, 0, 0];
        for (const sample of samples) {
          const sx = Math.min(size - 1, Math.round((x + sample.x * scale) * size));
          const sy = Math.min(size - 1, Math.round((y + sample.y * height) * size));
          const i = (sy * size + sx) * 4;
          const centered = [sample.r, sample.g, sample.b];
          for (let c = 0; c < 3; c++) {
            const value = source[i + c];
            sums[c] += value; squares[c] += value * value; covariance[c] += value * centered[c];
          }
        }
        // Normalized correlation ignores exposure shifts introduced by AI edits.
        let error = 0;
        for (let c = 0; c < 3; c++) error -= covariance[c] / Math.sqrt(Math.max(1, (squares[c] - sums[c] ** 2 / samples.length) * subjectVariance[c]));
        if (error < score) { score = error; best = { x, y, width: scale, height }; }
      }
    }
  };
  search(0.3, 1, 0, 0.7, 0, 0.7, 0.04);
  search(Math.max(0.2, best.width - 0.05), best.width + 0.05, Math.max(0, best.x - 0.05), best.x + 0.05, Math.max(0, best.y - 0.05), best.y + 0.05, 0.01);
  return { x: best.x * photo.naturalWidth, y: best.y * photo.naturalHeight, width: best.width * photo.naturalWidth, height: best.height * photo.naturalHeight };
}

export function CollectorSilhouette({ captureId, photoUrl }: { captureId?: string; photoUrl: string }) {
  const filterId = `collector-outline-${useId().replace(/:/g, '')}`;
  const { data: cutouts } = useContestWinnerCutouts();
  const url = captureId ? cutouts?.get(captureId) : undefined;
  const [aligned, setAligned] = useState<{ placement: Placement; width: number; height: number }>();
  useEffect(() => {
    let cancelled = false;
    if (!url) return;
    const key = `${photoUrl}|${url}`;
    const image = new Image();
    image.onload = async () => {
      try {
        const placement = placements.get(key) ?? await locateSilhouette(photoUrl, url);
        placements.set(key, placement);
        if (!cancelled) setAligned({ placement, width: image.naturalWidth, height: image.naturalHeight });
      } catch { /* Keep the original photo untouched if registration is unavailable. */ }
    };
    image.src = photoUrl;
    return () => { cancelled = true; };
  }, [photoUrl, url]);
  if (!url || !aligned) return null;
  const w = aligned.width, h = aligned.height;
  return (
    <svg className="collector-silhouette" width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        {/* Animal + a soft margin around it: the holographic foil never touches the animal. */}
        <filter id={`${filterId}-exclude`} x="-25%" y="-25%" width="150%" height="150%">
          <feMorphology in="SourceAlpha" operator="dilate" radius={w * 0.006} result="grown" />
          <feGaussianBlur in="grown" stdDeviation={w * 0.01} result="soft" />
          <feMerge result="alpha"><feMergeNode in="soft" /><feMergeNode in="SourceAlpha" /></feMerge>
          <feFlood floodColor="black" />
          <feComposite in2="alpha" operator="in" />
        </filter>
        <mask id={`${filterId}-background`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <rect width={w} height={h} fill="white" />
          <image href={url} {...aligned.placement} preserveAspectRatio="none" filter={`url(#${filterId}-exclude)`} />
        </mask>
        {/* Gold holo foil inspired by pokemon-cards-css "regular holo": repeating bands + pointer glare. */}
        <linearGradient id={`${filterId}-bands`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w * 0.22} y2={w * 0.13} spreadMethod="repeat">
          <stop offset="0" stopColor="hsl(42, 90%, 55%)" />
          <stop offset="0.25" stopColor="hsl(50, 100%, 80%)" />
          <stop offset="0.5" stopColor="hsl(32, 80%, 45%)" />
          <stop offset="0.75" stopColor="hsl(55, 100%, 88%)" />
          <stop offset="1" stopColor="hsl(42, 90%, 55%)" />
        </linearGradient>
        <linearGradient id={`${filterId}-scan`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w * 0.012} y2={-w * 0.012} spreadMethod="repeat">
          <stop offset="0" stopColor="black" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <radialGradient id={`${filterId}-glare`}>
          <stop offset="0" stopColor="hsl(50, 100%, 92%)" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="hsl(42, 90%, 60%)" stopOpacity="0.15" />
          <stop offset="1" stopColor="black" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g mask={`url(#${filterId}-background)`}>
        <g className="collector-foil-bands">
          <rect x={-w} y={-h} width={w * 3} height={h * 3} fill={`url(#${filterId}-bands)`} />
          <rect x={-w} y={-h} width={w * 3} height={h * 3} fill={`url(#${filterId}-scan)`} style={{ mixBlendMode: 'overlay' }} opacity="0.5" />
        </g>
        <g className="collector-foil-glare">
          <ellipse cx={w / 2} cy={h / 2} rx={w * 0.6} ry={h * 0.5} fill={`url(#${filterId}-glare)`} />
        </g>
      </g>
    </svg>
  );
}
