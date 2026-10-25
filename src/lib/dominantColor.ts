import { useEffect, useState } from 'react';

export interface BoosterTint {
  /** Triplet HSL "h s% l%" utilisable dans hsl() */
  base: string;
  light: string;
  dark: string;
}

const cache = new Map<string, BoosterTint | null>();

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
};

const sample = (src: string): Promise<BoosterTint | null> =>
  new Promise(resolve => {
    if (cache.has(src)) return resolve(cache.get(src) ?? null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 8;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('no ctx');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        if (!n) throw new Error('empty');
        const [h, s, l] = rgbToHsl(r / n, g / n, b / n);
        // Teinte métallique lisible : saturation relevée, luminosité bornée
        const sat = clamp(s * 1.25 + 12, 30, 78);
        const lum = clamp(l, 30, 52);
        const tint: BoosterTint = {
          base: `${Math.round(h)} ${Math.round(sat)}% ${Math.round(lum)}%`,
          light: `${Math.round(h)} ${Math.round(clamp(sat - 8, 18, 70))}% ${Math.round(clamp(lum + 20, 0, 74))}%`,
          dark: `${Math.round(h)} ${Math.round(clamp(sat + 6, 0, 84))}% ${Math.round(clamp(lum - 20, 10, 40))}%`,
        };
        cache.set(src, tint);
        resolve(tint);
      } catch {
        cache.set(src, null); // canvas tainted (CORS) ou illisible : garder le vert par défaut
        resolve(null);
      }
    };
    img.onerror = () => { cache.set(src, null); resolve(null); };
    img.src = src;
  });

/** Couleur dominante d'une illustration de booster, pour teinter ses scellages métalliques. */
export const useBoosterTint = (src: string | undefined): BoosterTint | null => {
  const [tint, setTint] = useState<BoosterTint | null>(src ? cache.get(src) ?? null : null);
  useEffect(() => {
    if (!src) { setTint(null); return; }
    let alive = true;
    void sample(src).then(t => { if (alive) setTint(t); });
    return () => { alive = false; };
  }, [src]);
  return tint;
};
