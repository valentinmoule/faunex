/** Image helpers shared by the capture flow (camera + gallery import). */

/** Decode a dataURL into a drawable bitmap/image, preferring the (much faster,
 *  off-main-thread) createImageBitmap path when available. */
const decode = async (dataUrl: string): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      return await createImageBitmap(blob);
    } catch {
      /* fall through to the <img> path */
    }
  }
  return await new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = dataUrl;
  });
};

/** Approximate byte size of a base64 dataURL. */
export const dataUrlBytes = (dataUrl: string): number => {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
};

/** Resize + re-encode an image dataURL. Returns the original when it is already
 *  smaller than the target (no useless re-encode/quality loss). */
export const resizeDataUrl = async (
  dataUrl: string,
  maxSize: number,
  quality: number,
): Promise<string> => {
  try {
    const img = await decode(dataUrl);
    const w0 = 'width' in img ? img.width : 0;
    const h0 = 'height' in img ? img.height : 0;
    if (!w0 || !h0) return dataUrl;
    const scale = Math.min(1, maxSize / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(img as CanvasImageSource, 0, 0, w, h);
    if ('close' in img) img.close();
    const out = c.toDataURL('image/jpeg', quality);
    // Une image déjà légère ne doit pas être ré-encodée pour rien.
    return scale === 1 && out.length > dataUrl.length ? dataUrl : out;
  } catch {
    return dataUrl;
  }
};

/** Décode un HEIC/HEIF (photos iPhone) en JPEG dans le navigateur.
 *  Chargé à la demande : le décodeur libheif (wasm) ne pèse sur le bundle que
 *  pour les utilisateurs qui importent réellement une photo HEIC. */
const heicToJpegDataUrl = async (dataUrl: string): Promise<string | null> => {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const { heicTo } = await import('heic-to');
    const jpeg = await heicTo({ blob, type: 'image/jpeg', quality: 0.9 });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(jpeg);
    });
  } catch (e) {
    console.error('HEIC conversion failed', e);
    return null;
  }
};

/** Normalise the source photo (camera frame or imported file) before it is used
 *  anywhere in the app: keeps memory, storage upload and preview rendering sane
 *  even when the user imports a 12 Mpx / 15 MB photo from the gallery.
 *  1600px / 0.82 stays well above what the AI and the card display need.
 *  Les HEIC/HEIF (iPhone), que la plupart des navigateurs ne savent pas décoder,
 *  sont convertis en JPEG à la volée. `null` n'est renvoyé que si l'image reste
 *  réellement illisible après cette conversion. */
export const prepareSourceImage = async (dataUrl: string): Promise<string | null> => {
  const decodable = async (url: string) => {
    try {
      const img = await decode(url);
      const w = 'width' in img ? img.width : 0;
      if ('close' in img) img.close();
      return w > 0;
    } catch {
      return false;
    }
  };

  let source = dataUrl;
  if (!(await decodable(source))) {
    // Cas très majoritaire d'un échec de décodage : un HEIC/HEIF d'iPhone
    // (parfois renommé .jpg). On le convertit plutôt que de le refuser.
    const converted = await heicToJpegDataUrl(dataUrl);
    if (!converted || !(await decodable(converted))) return null;
    source = converted;
  }
  return await resizeDataUrl(source, 1600, 0.82);
};



/** Compress an image dataURL to a max dimension and JPEG quality for AI.
 *  Higher resolution + quality => better recognition accuracy, but also
 *  higher token cost and slower uploads. */
export const compressForAI = (dataUrl: string, maxSize = 1024, quality = 0.62): Promise<string> =>
  resizeDataUrl(dataUrl, maxSize, quality);


/** Compute a stable SHA-256 hash of a dataURL so we can cache AI results
 *  for identical images and avoid paying twice for the same photo. */
export const hashDataUrl = async (dataUrl: string): Promise<string> => {
  const base64 = dataUrl.split(',')[1] ?? dataUrl;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/** Convert a base64 dataURL into raw bytes for storage upload. */
export const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64Data = dataUrl.split(',')[1];
  return Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
};

/** Read a File as a dataURL. */
export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
