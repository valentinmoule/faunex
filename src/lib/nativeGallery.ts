import { IS_NATIVE_APP } from '@/lib/platform';
import { exifDateToIso } from '@/lib/exif';

/**
 * Sélecteur de photos natif (app installée iOS/Android).
 *
 * Dans l'app installée, on passe par le sélecteur du système plutôt que par
 * <input type="file"> : iOS télécharge alors automatiquement l'original depuis
 * iCloud (le mode « Optimiser le stockage » ne garde qu'une vignette sur
 * l'appareil, et l'input renvoie un fichier vide dans ce cas).
 *
 * Renvoie la dataURL JPEG + les infos EXIF utiles (GPS, signature d'appareil),
 * `null` si l'explorateur annule, et lève une erreur si la lecture échoue.
 */
export interface NativeGalleryPhoto {
  dataUrl: string;
  gps: { lat: number; lng: number } | null;
  /** null quand le système ne fournit aucune métadonnée (on ne signale rien). */
  looksLikeCameraPhoto: boolean | null;
  /** Date de prise de vue (ISO) lue dans les métadonnées. */
  takenAt?: string | null;
}

type AnyRec = Record<string, unknown>;

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string' || !v.trim()) return null;
  // Android : "48/1,51/1,2436/100" (degrés, minutes, secondes en rationnels)
  if (v.includes('/') || v.includes(',')) {
    const parts = v.split(',').map((p) => {
      const [a, b] = p.split('/').map(Number);
      return b ? a / b : a;
    });
    if (parts.some((p) => !Number.isFinite(p))) return null;
    return (parts[0] ?? 0) + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const signed = (value: number | null, ref: unknown, neg: string) =>
  value === null ? null : String(ref ?? '').toUpperCase().startsWith(neg) ? -Math.abs(value) : value;

export const parseNativeExif = (exif: unknown): Omit<NativeGalleryPhoto, 'dataUrl'> => {
  if (!exif || typeof exif !== 'object') return { gps: null, looksLikeCameraPhoto: null };
  const root = exif as AnyRec;
  const gpsBlock = (root['{GPS}'] ?? root.GPS ?? root) as AnyRec;
  const tiff = (root['{TIFF}'] ?? root.TIFF ?? root) as AnyRec;
  const exifBlock = (root['{Exif}'] ?? root.Exif ?? root) as AnyRec;

  const lat = signed(num(gpsBlock.Latitude ?? gpsBlock.GPSLatitude), gpsBlock.LatitudeRef ?? gpsBlock.GPSLatitudeRef, 'S');
  const lng = signed(num(gpsBlock.Longitude ?? gpsBlock.GPSLongitude), gpsBlock.LongitudeRef ?? gpsBlock.GPSLongitudeRef, 'W');
  const gps =
    lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
      ? { lat, lng }
      : null;

  const hasAny = Object.keys(root).length > 0;
  const looks = Boolean(
    gps || tiff.Make || tiff.Model || exifBlock.DateTimeOriginal || root.DateTime || root.DateTimeOriginal,
  );
  const takenAt = exifDateToIso(exifBlock.DateTimeOriginal ?? root.DateTimeOriginal ?? tiff.DateTime ?? root.DateTime);
  return { gps, looksLikeCameraPhoto: hasAny ? looks : null, takenAt };
};

export const pickNativeGalleryPhoto = async (): Promise<NativeGalleryPhoto | null> => {
  if (!IS_NATIVE_APP) return null;
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.DataUrl,
      // Même budget que la photo prise dans l'app : ~1600 px, JPEG.
      quality: 90,
      width: 1600,
      correctOrientation: true,
      allowEditing: false,
    });
    if (!photo.dataUrl) return null;
    let meta: Omit<NativeGalleryPhoto, 'dataUrl'> = { gps: null, looksLikeCameraPhoto: null };
    try {
      meta = parseNativeExif(photo.exif);
    } catch {
      /* métadonnées illisibles : non bloquant */
    }
    return { dataUrl: photo.dataUrl, ...meta };
  } catch (err) {
    const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
    // Annulation utilisateur : pas une erreur.
    if (msg.includes('cancel') || msg.includes('annul')) return null;
    throw err;
  }
};
