/** Image helpers shared by the capture flow (camera + gallery import). */

/** Compress an image dataURL to a max dimension and JPEG quality for AI.
 *  Higher resolution + quality => better recognition accuracy. */
export const compressForAI = (dataUrl: string, maxSize = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
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
