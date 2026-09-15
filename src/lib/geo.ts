import { IS_NATIVE_APP } from '@/lib/platform';

export interface SimplePosition {
  coords: { latitude: number; longitude: number; accuracy?: number };
}

interface GeoOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
}

/**
 * Récupère la position courante.
 *
 * Sur les apps natives on passe par le plugin Capacitor : la demande
 * d'autorisation est alors celle du système (« Faunex »), et non celle du
 * WebView qui affichait « localhost ».
 */
export const getCurrentPosition = async (
  onSuccess: (pos: SimplePosition) => void,
  onError?: (err?: unknown) => void,
  options: GeoOptions = {},
): Promise<void> => {
  const { enableHighAccuracy = false, timeout = 10000 } = options;

  if (IS_NATIVE_APP) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      let status = await Geolocation.checkPermissions();
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        status = await Geolocation.requestPermissions({ permissions: ['location'] });
      }
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        onError?.(new Error('permission-denied'));
        return;
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
      onSuccess({
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      });
      return;
    } catch (e) {
      onError?.(e);
      return;
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.(new Error('unavailable'));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess(pos),
    (err) => onError?.(err),
    { enableHighAccuracy, timeout },
  );
};

/** true si une source de localisation est disponible (natif ou web). */
export const isGeolocationAvailable = (): boolean =>
  IS_NATIVE_APP || (typeof navigator !== 'undefined' && !!navigator.geolocation);
