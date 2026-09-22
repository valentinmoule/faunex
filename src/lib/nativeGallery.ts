import { IS_NATIVE_APP } from '@/lib/platform';

/**
 * Sélecteur de photos natif (app installée iOS/Android).
 *
 * Dans l'app installée, on passe par le sélecteur du système plutôt que par
 * <input type="file"> : iOS télécharge alors automatiquement l'original depuis
 * iCloud (le mode « Optimiser le stockage » ne garde qu'une vignette sur
 * l'appareil, et l'input renvoie un fichier vide dans ce cas).
 *
 * Renvoie une dataURL JPEG prête pour le pipeline habituel, `null` si
 * l'explorateur annule, et lève une erreur si la lecture échoue vraiment.
 */
export const pickNativeGalleryPhoto = async (): Promise<string | null> => {
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
    return photo.dataUrl ?? null;
  } catch (err) {
    const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
    // Annulation utilisateur : pas une erreur.
    if (msg.includes('cancel') || msg.includes('annul')) return null;
    throw err;
  }
};
