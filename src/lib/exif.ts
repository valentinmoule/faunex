/**
 * Lecture minimale des métadonnées EXIF d'un fichier image (anti-triche).
 *
 * Une photo réellement prise avec un smartphone ou un appareil photo contient
 * quasi toujours un bloc EXIF avec la marque/le modèle de l'appareil et la date
 * de prise de vue. Une image récupérée sur le web, une capture d'écran ou un
 * rendu généré n'en a pas (ou n'a qu'un champ « logiciel »).
 *
 * On ne lit que quelques tags dans l'IFD0 / le sous-IFD EXIF, sans dépendance :
 * seuls les 256 premiers Ko du fichier sont nécessaires.
 */
export interface ExifCameraInfo {
  /** true si un bloc EXIF exploitable a été trouvé. */
  hasExif: boolean;
  make: string | null;
  model: string | null;
  /** DateTimeOriginal ou DateTime (chaîne EXIF brute). */
  dateTimeOriginal: string | null;
  software: string | null;
  hasGps: boolean;
  /** Coordonnées GPS EXIF (degrés décimaux), si présentes. */
  gps: { lat: number; lng: number } | null;
  /** true si la photo porte une signature d'appareil crédible. */
  looksLikeCameraPhoto: boolean;
}

const EMPTY: ExifCameraInfo = {
  hasExif: false,
  make: null,
  model: null,
  dateTimeOriginal: null,
  software: null,
  hasGps: false,
  gps: null,
  looksLikeCameraPhoto: false,
};

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_SOFTWARE = 0x0131;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATETIME_ORIGINAL = 0x9003;

/** Localise le segment APP1/Exif d'un JPEG. */
const findExifSegment = (view: DataView): number | null => {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset++;
      continue;
    }
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1 && offset + 10 < view.byteLength) {
      // "Exif\0\0"
      const tag = String.fromCharCode(
        view.getUint8(offset + 4),
        view.getUint8(offset + 5),
        view.getUint8(offset + 6),
        view.getUint8(offset + 7),
      );
      if (tag === 'Exif') return offset + 10;
    }
    if (marker === 0xda) return null; // début des données image
    if (size <= 0) return null;
    offset += 2 + size;
  }
  return null;
};

const readAscii = (view: DataView, offset: number, length: number): string =>
  Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i)))
    .join('')
    .replace(/\0.*$/, '')
    .trim();

/** Lit un rationnel EXIF (deux uint32) en nombre flottant. */
const readRational = (
  view: DataView,
  tiffStart: number,
  valueOffset: number,
  index: number,
  little: boolean,
): number | null => {
  const base = tiffStart + valueOffset + index * 8;
  if (base + 8 > view.byteLength) return null;
  const num = view.getUint32(base, little);
  const den = view.getUint32(base + 4, little);
  if (!den) return null;
  return num / den;
};

/** Tags du sous-IFD GPS. */
const GPS_LAT_REF = 0x0001;
const GPS_LAT = 0x0002;
const GPS_LNG_REF = 0x0003;
const GPS_LNG = 0x0004;

/** Extrait lat/lng en degrés décimaux depuis le sous-IFD GPS. */
const parseGpsIfd = (
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  little: boolean,
): { lat: number; lng: number } | null => {
  if (ifdOffset <= 0 || tiffStart + ifdOffset + 2 > view.byteLength) return null;
  const base = tiffStart + ifdOffset;
  const count = view.getUint16(base, little);
  let latRef = 'N';
  let lngRef = 'E';
  let latValues: number[] | null = null;
  let lngValues: number[] | null = null;
  const readDms = (valueOffset: number): number[] | null => {
    const d = readRational(view, tiffStart, valueOffset, 0, little);
    const m = readRational(view, tiffStart, valueOffset, 1, little);
    const s = readRational(view, tiffStart, valueOffset, 2, little);
    return d === null || m === null || s === null ? null : [d, m, s];
  };
  for (let i = 0; i < count; i++) {
    const entry = base + 2 + i * 12;
    if (entry + 12 > view.byteLength) return null;
    const tag = view.getUint16(entry, little);
    const type = view.getUint16(entry + 2, little);
    const valueOffset =
      type === 5 ? view.getUint32(entry + 8, little) : entry + 8;
    switch (tag) {
      case GPS_LAT_REF:
        latRef = String.fromCharCode(view.getUint8(entry + 8)) || 'N';
        break;
      case GPS_LNG_REF:
        lngRef = String.fromCharCode(view.getUint8(entry + 8)) || 'E';
        break;
      case GPS_LAT:
        if (type === 5) latValues = readDms(valueOffset);
        break;
      case GPS_LNG:
        if (type === 5) lngValues = readDms(valueOffset);
        break;
      default:
        break;
    }
  }
  if (!latValues || !lngValues) return null;
  const toDeg = ([d, m, s]: number[], ref: string, negRef: string) => {
    const v = d + m / 60 + s / 3600;
    return ref.toUpperCase() === negRef ? -v : v;
  };
  const lat = toDeg(latValues, latRef, 'S');
  const lng = toDeg(lngValues, lngRef, 'W');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

/** Parcourt un IFD et renseigne les tags qui nous intéressent. */
const readIfd = (
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  little: boolean,
  out: ExifCameraInfo,
  depth = 0,
) => {
  if (depth > 2 || ifdOffset <= 0 || tiffStart + ifdOffset + 2 > view.byteLength) return;
  const base = tiffStart + ifdOffset;
  const count = view.getUint16(base, little);
  for (let i = 0; i < count; i++) {
    const entry = base + 2 + i * 12;
    if (entry + 12 > view.byteLength) return;
    const tag = view.getUint16(entry, little);
    const type = view.getUint16(entry + 2, little);
    const num = view.getUint32(entry + 4, little);
    const valueOffset =
      type === 2 && num > 4 ? tiffStart + view.getUint32(entry + 8, little) : entry + 8;

    const asString = () =>
      type === 2 && valueOffset + num <= view.byteLength
        ? readAscii(view, valueOffset, num) || null
        : null;

    switch (tag) {
      case TAG_MAKE:
        out.make = asString();
        break;
      case TAG_MODEL:
        out.model = asString();
        break;
      case TAG_SOFTWARE:
        out.software = asString();
        break;
      case TAG_DATETIME:
        out.dateTimeOriginal = out.dateTimeOriginal ?? asString();
        break;
      case TAG_DATETIME_ORIGINAL:
        out.dateTimeOriginal = asString() ?? out.dateTimeOriginal;
        break;
      case TAG_GPS_IFD:
        out.hasGps = true;
        out.gps =
          out.gps ?? parseGpsIfd(view, tiffStart, view.getUint32(entry + 8, little), little);
        break;
      case TAG_EXIF_IFD:
        readIfd(view, tiffStart, view.getUint32(entry + 8, little), little, out, depth + 1);
        break;
      default:
        break;
    }
  }
};

/** Extrait les infos d'appareil d'un fichier image importé. */
export const readExifCameraInfo = async (file: File): Promise<ExifCameraInfo> => {
  try {
    const buffer = await file.slice(0, 512 * 1024).arrayBuffer();
    const view = new DataView(buffer);
    const tiffStart = findExifSegment(view);
    if (tiffStart === null || tiffStart + 8 > view.byteLength) return { ...EMPTY };

    const byteOrder = view.getUint16(tiffStart);
    if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return { ...EMPTY };
    const little = byteOrder === 0x4949;
    if (view.getUint16(tiffStart + 2, little) !== 0x002a) return { ...EMPTY };

    const info: ExifCameraInfo = { ...EMPTY, hasExif: true };
    readIfd(view, tiffStart, view.getUint32(tiffStart + 4, little), little, info);

    // Une capture d'écran iOS/Android porte un EXIF mais sans marque/modèle
    // d'appareil : on exige une signature matérielle ou une date de prise de vue
    // accompagnée d'une géolocalisation.
    info.looksLikeCameraPhoto = Boolean(
      (info.make && info.model) || (info.dateTimeOriginal && info.hasGps),
    );
    return info;
  } catch (err) {
    console.warn('exif read failed', err);
    return { ...EMPTY };
  }
};

/** HEIC/HEIF (iPhone) : conteneur ISO-BMFF, jamais un JPEG téléchargé du web. */
export const isHeicFile = (file: File): boolean =>
  /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
