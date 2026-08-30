import { useCallback, useState } from 'react';

type Coords = { lat: number; lng: number };

/** Captures the current GPS position and resolves a human-readable place name. */
export const useGeoTag = () => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [name, setName] = useState<string | null>(null);

  const reset = useCallback(() => {
    setCoords(null);
    setName(null);
  }, []);

  /** Renseigne les coordonnées et résout un nom de lieu lisible. */
  const apply = useCallback(async (next: Coords) => {
    setCoords(next);
    const fallback = `${next.lat.toFixed(4)}, ${next.lng.toFixed(4)}`;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${next.lat}&lon=${next.lng}&format=json&zoom=10&accept-language=fr`
      );
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.village || '';
      const country = data.address?.country || '';
      setName([city, country].filter(Boolean).join(', ') || fallback);
    } catch {
      setName(fallback);
    }
  }, []);

  const capture = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void apply({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => reset(),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [apply, reset]);

  return { coords, name, capture, apply, reset };
};
