/**
 * Miniatures d'affichage.
 *
 * Les photos de captures sont stockées en pleine résolution (1600 px) : les
 * grilles, le feed et la carte n'en ont pas besoin. Le stockage sait
 * redimensionner à la volée (`/render/image/public/...`), ce qui permet de
 * servir des miniatures pour TOUTES les captures existantes sans retraitement
 * ni colonne supplémentaire (≈ 176 Ko → ≈ 50 Ko par vignette).
 *
 * La pleine résolution reste utilisée dans la vue détail et le plein écran.
 */
const PUBLIC_OBJECT = '/storage/v1/object/public/';
const PUBLIC_RENDER = '/storage/v1/render/image/public/';

export const thumbUrl = (url?: string | null, width = 400, quality = 65): string => {
  if (!url || !url.includes(PUBLIC_OBJECT)) return url || '';
  // Les URLs déjà transformées ou externes ne sont pas retouchées.
  if (url.includes(PUBLIC_RENDER)) return url;
  const base = url.replace(PUBLIC_OBJECT, PUBLIC_RENDER);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${width}&quality=${quality}&resize=cover`;
};
