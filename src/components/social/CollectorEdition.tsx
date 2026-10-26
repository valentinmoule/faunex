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
  let best = { x: 0, y: 0, width: 1, height: 1 }, score = Infinity;
  const ratio = (mask.naturalHeight / mask.naturalWidth) / (photo.naturalHeight / photo.naturalWidth);
  const search = (minScale: number, maxScale: number, minX: number, maxX: number, minY: number, maxY: number, step: number) => {
    for (let scale = minScale; scale <= maxScale; scale += step) {
      const height = scale * ratio;
      for (let y = minY; y <= Math.min(maxY, 1 - height); y += step) for (let x = minX; x <= Math.min(maxX, 1 - scale); x += step) {
        let error = 0;
        for (const sample of samples) {
          const sx = Math.min(size - 1, Math.round((x + sample.x * scale) * size));
          const sy = Math.min(size - 1, Math.round((y + sample.y * height) * size));
          const i = (sy * size + sx) * 4;
          error += (source[i] - sample.r) ** 2 + (source[i + 1] - sample.g) ** 2 + (source[i + 2] - sample.b) ** 2;
        }
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
  return (
    <svg className="collector-silhouette" width="100%" height="100%" viewBox={`0 0 ${aligned.width} ${aligned.height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={`${filterId}-black`}>
          <feFlood floodColor="black" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <mask id={`${filterId}-background`} maskUnits="userSpaceOnUse" x="0" y="0" width={aligned.width} height={aligned.height}>
          <rect width={aligned.width} height={aligned.height} fill="white" />
          <image href={url} {...aligned.placement} preserveAspectRatio="none" filter={`url(#${filterId}-black)`} />
        </mask>
        <linearGradient id={`${filterId}-foil`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" className="collector-foil-stop" stopOpacity="0" />
          <stop offset="0.35" className="collector-foil-stop" stopOpacity="0" />
          <stop offset="0.46" className="collector-foil-stop" stopOpacity="0.06" />
          <stop offset="0.5" className="collector-foil-stop" stopOpacity="0.22" />
          <stop offset="0.54" className="collector-foil-stop" stopOpacity="0.06" />
          <stop offset="0.65" className="collector-foil-stop" stopOpacity="0" />
          <stop offset="1" className="collector-foil-stop" stopOpacity="0" />
        </linearGradient>
        <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius={aligned.width * 0.008} result="expanded" />
          <feGaussianBlur in="expanded" stdDeviation={aligned.width * 0.014} result="softEdge" />
          <feComposite in="softEdge" in2="SourceAlpha" operator="out" result="outerEdge" />
          <feFlood className="collector-outline-gold" floodOpacity="0.72" result="gold" />
          <feComposite in="gold" in2="outerEdge" operator="in" result="halo" />
          <feOffset in="SourceAlpha" dy={aligned.width * 0.016} result="offset" />
          <feGaussianBlur in="offset" stdDeviation={aligned.width * 0.013} result="softShadow" />
          <feComposite in="softShadow" in2="SourceAlpha" operator="out" result="outerShadow" />
          <feFlood className="collector-outline-shadow" floodOpacity="0.4" result="shadowColor" />
          <feComposite in="shadowColor" in2="outerShadow" operator="in" result="shadow" />
          <feMerge><feMergeNode in="shadow" /><feMergeNode in="halo" /></feMerge>
        </filter>
      </defs>
      <g mask={`url(#${filterId}-background)`}>
        <rect width={aligned.width} height={aligned.height} className="collector-background-depth" fillOpacity="0.12" />
        <rect x={-aligned.width} y={-aligned.height} width={aligned.width * 3} height={aligned.height * 3} fill={`url(#${filterId}-foil)`} className="collector-background-foil" />
      </g>
      <image href={url} {...aligned.placement} preserveAspectRatio="none" filter={`url(#${filterId})`} />
    </svg>
  );
}
