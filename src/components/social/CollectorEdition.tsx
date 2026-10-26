import { useEffect, useState } from 'react';
import type React from 'react';
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
export function CollectorHoloLayers({ captureId, photoUrl }: { captureId?: string; photoUrl?: string }) {
  const { data: cutouts } = useContestWinnerCutouts();
  const url = captureId ? cutouts?.get(captureId) : undefined;
  const [mask, setMask] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    if (!url || !photoUrl) return;
    buildBackgroundMask(photoUrl, url)
      .then((m) => { if (!cancelled) setMask(m); })
      .catch(() => { /* Sans analyse fiable, le foil reste uniforme. */ });
    return () => { cancelled = true; };
  }, [photoUrl, url]);
  const style = mask ? ({ WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})` } as React.CSSProperties) : undefined;
  return (
    <div className={`tg-holo${mask ? ' tg-holo--masked' : ''}`} style={style} aria-hidden="true">
      <div className="tg-holo__shine" />
      <div className="tg-holo__glare" />
    </div>
  );
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

const maskCache = new Map<string, string>();

/** Inverse mask (white = background, transparent = animal + soft margin) at the photo's own size. */
async function buildBackgroundMask(photoUrl: string, cutoutUrl: string): Promise<string> {
  const key = `${photoUrl}|${cutoutUrl}`;
  const cached = maskCache.get(key);
  if (cached) return cached;
  const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
  const [photo, cutout] = await Promise.all([load(photoUrl), load(cutoutUrl)]);
  const placement = placements.get(key) ?? await locateSilhouette(photoUrl, cutoutUrl);
  placements.set(key, placement);
  const scale = Math.min(1, 512 / photo.naturalWidth);
  const w = Math.round(photo.naturalWidth * scale), h = Math.round(photo.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  const px = placement.x * scale, py = placement.y * scale, pw = placement.width * scale, ph = placement.height * scale;
  const grow = w * 0.012;
  ctx.filter = `blur(${w * 0.025}px)`;
  for (const [dx, dy] of [[0, 0], [grow, 0], [-grow, 0], [0, grow], [0, -grow], [grow, grow], [-grow, -grow], [grow, -grow], [-grow, grow]]) {
    ctx.drawImage(cutout, px + dx, py + dy, pw, ph);
  }
  ctx.filter = 'none';
  ctx.drawImage(cutout, px, py, pw, ph);
  // Analyse du décor : le foil suit la texture (contours, reliefs, zones claires) des éléments du fond.
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = w; photoCanvas.height = h;
  const pctx = photoCanvas.getContext('2d');
  if (pctx) {
    pctx.drawImage(photo, 0, 0, w, h);
    const src = pctx.getImageData(0, 0, w, h).data;
    const out = ctx.getImageData(0, 0, w, h);
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) lum[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const edge = Math.min(1, (Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + w] - lum[i - w])) * 3);
      const detail = Math.min(1, 0.25 + lum[i] * 0.45 + edge * 0.6);
      out.data[i * 4 + 3] = Math.round(out.data[i * 4 + 3] * detail);
    }
    ctx.putImageData(out, 0, 0);
  }
  const url = canvas.toDataURL('image/png');
  maskCache.set(key, url);
  return url;
}

/**
 * Gold « V full art » foil from pokemon-cards-css (sunpillar bands + diagonal
 * scanlines + pointer glare), masked by the AI silhouette so the animal is never covered.
 */
/** Silhouette/detourage disabled: Trainer Gallery Holofoil keeps the original photo untouched. */
export function CollectorSilhouette(_props: { captureId?: string; photoUrl: string }) {
  return null;
}
