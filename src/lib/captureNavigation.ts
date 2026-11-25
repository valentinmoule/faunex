import type { AnimalCard } from '@/data/mockData';

/** Follow the displayed list, including its filters and custom order. */
export const captureNavigationIndex = (captures: AnimalCard[], card: AnimalCard | null) => {
  if (!card) return -1;
  return captures.findIndex(capture => capture.id === card.id);
};

/** A vertical scroll or a short tap must never change the selected capture. */
export const captureSwipeStep = (dx: number, dy: number): -1 | 0 | 1 => {
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) return 0;
  return dx < 0 ? 1 : -1;
};

export const adjacentCaptureIndex = (index: number, total: number, step: number): number | null => {
  const next = index + step;
  return index >= 0 && step !== 0 && next >= 0 && next < total ? next : null;
};