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
