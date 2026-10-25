import jpeg from 'npm:jpeg-js@0.4.4';

/** Compare a canvas-produced derivative with the validated original, never with client assertions. */
export function matchesCrop(original: Uint8Array, saved: Uint8Array, area: { x: number; y: number; width: number; height: number }): boolean {
  const options = { useTArray: true, maxResolutionInMP: 2, maxMemoryUsageInMB: 64 };
  const source = jpeg.decode(original, options);
  const target = jpeg.decode(saved, options);
  if (area.x + area.width > source.width + 1 || area.y + area.height > source.height + 1) return false;
  const scale = Math.min(1, 1024 / Math.max(area.width, area.height));
  if (target.width !== Math.round(area.width * scale) || target.height !== Math.round(area.height * scale)) return false;
  let error = 0;
  let samples = 0;
  for (let y = 2; y < target.height - 2; y += Math.max(1, Math.floor(target.height / 48))) {
    for (let x = 2; x < target.width - 2; x += Math.max(1, Math.floor(target.width / 48))) {
      const sx = Math.min(source.width - 1, Math.max(0, Math.round(area.x + (x + 0.5) / scale - 0.5)));
      const sy = Math.min(source.height - 1, Math.max(0, Math.round(area.y + (y + 0.5) / scale - 0.5)));
      for (let channel = 0; channel < 3; channel++) {
        error += Math.abs(source.data[(sy * source.width + sx) * 4 + channel] - target.data[(y * target.width + x) * 4 + channel]);
        samples++;
      }
    }
  }
  return samples > 0 && error / samples < 16;
}