import type { AnimalCard } from '@/data/mockData';

export interface CaptureImageUpdate {
  captureId: string;
  userId: string;
  imageUrl: string;
}

const EVENT = 'faunex:capture-image-updated';

export function publishCaptureImageUpdate(update: CaptureImageUpdate) {
  window.dispatchEvent(new CustomEvent<CaptureImageUpdate>(EVENT, { detail: update }));
}

export function subscribeCaptureImageUpdates(listener: (update: CaptureImageUpdate) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<CaptureImageUpdate>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function updateCaptureImage(card: AnimalCard, update: CaptureImageUpdate): AnimalCard {
  return card.id === update.captureId ? { ...card, image: update.imageUrl, subjectBox: undefined } : card;
}