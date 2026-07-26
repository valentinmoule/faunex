import { useCallback, useState } from 'react';

/** Captures the current GPS position and resolves a human-readable place name. */
export const useGeoTag = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState<string | null>(null);

  const reset = useCallback(() => {
    setCoords(null);
    setName(null);
  }, []);

  const capture = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
      },
      () => reset(),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [reset]);

  return { coords, name, capture, reset };
};
