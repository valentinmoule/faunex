/**
 * Génère une image partageable d'une capture : photo + cadre de rareté +
 * effet holographique « figé » (arc-en-ciel + glare diagonal, sans parallaxe).
 *
 * Tout est peint au canvas 2D : rendu identique sur tous les navigateurs,
 * aucune dépendance, et le résultat peut être partagé via l'API Web Share.
 */
import type { AnimalCard, Rarity } from '@/data/mockData';
import { normalizeRarity } from '@/data/mockData';
import { IS_NATIVE_APP } from '@/lib/platform';

const W = 1080;
const H = 1350;

/* ── Cadres de rareté : mêmes dégradés que les tuiles de l'app
      (--rarity-frame-neutral / gold / mythic / legendary / iridescent) ── */
type FrameKind = 'neutral' | 'gold' | 'iridescent' | 'mythic' | 'legendary';
type Metal = 'gray' | 'gold' | 'iridescent';

const FRAMES: Record<FrameKind, Array<[number, string]>> = {
  neutral: [
    [0, 'hsl(220, 8%, 51%)'], [13, 'hsl(215, 13%, 91%)'], [24, 'hsl(220, 8%, 62%)'],
    [33, 'hsl(215, 12%, 97%)'], [48, 'hsl(220, 9%, 55%)'], [63, 'hsl(215, 11%, 85%)'],
    [78, 'hsl(220, 8%, 47%)'], [89, 'hsl(215, 15%, 96%)'], [100, 'hsl(220, 9%, 57%)'],
  ],
  gold: [
    [0, 'hsl(38, 75%, 37%)'], [13, 'hsl(49, 95%, 85%)'], [25, 'hsl(40, 92%, 51%)'],
    [34, 'hsl(52, 100%, 94%)'], [48, 'hsl(37, 82%, 40%)'], [64, 'hsl(46, 97%, 72%)'],
    [78, 'hsl(34, 81%, 36%)'], [89, 'hsl(50, 100%, 90%)'], [100, 'hsl(40, 92%, 53%)'],
  ],
  iridescent: [
    [0, 'hsl(265, 90%, 55%)'], [12, 'hsl(320, 95%, 62%)'], [24, 'hsl(190, 100%, 55%)'],
    [34, 'hsl(255, 95%, 70%)'], [47, 'hsl(300, 95%, 60%)'], [61, 'hsl(170, 95%, 48%)'],
    [75, 'hsl(275, 90%, 58%)'], [85, 'hsl(45, 100%, 60%)'], [93, 'hsl(330, 95%, 60%)'],
    [100, 'hsl(200, 100%, 60%)'],
  ],
  mythic: [
    [0, 'hsl(285, 84%, 48%)'], [18, 'hsl(315, 95%, 66%)'], [37, 'hsl(190, 94%, 72%)'],
    [54, 'hsl(265, 90%, 60%)'], [72, 'hsl(320, 92%, 65%)'], [88, 'hsl(185, 95%, 65%)'],
    [100, 'hsl(285, 84%, 48%)'],
  ],
  legendary: [
    [0, 'hsl(42, 100%, 47%)'], [13, 'hsl(52, 100%, 82%)'], [27, 'hsl(185, 100%, 56%)'],
    [42, 'hsl(222, 97%, 52%)'], [59, 'hsl(305, 95%, 57%)'], [74, 'hsl(47, 100%, 70%)'],
    [88, 'hsl(175, 100%, 52%)'], [100, 'hsl(42, 100%, 47%)'],
  ],
};

/* Métal des étoiles : mêmes teintes que RarityBadge (tokens --rarity-icon-*) */
const METALS: Record<Metal, Array<[number, string]>> = {
  gray: [
    [0, 'hsl(220, 12%, 36%)'], [20, 'hsl(215, 13%, 91%)'], [37, 'hsl(220, 9%, 58%)'],
    [55, 'hsl(215, 13%, 91%)'], [76, 'hsl(220, 12%, 36%)'], [100, 'hsl(220, 9%, 58%)'],
  ],
  gold: [
    [0, 'hsl(38, 75%, 33%)'], [20, 'hsl(49, 95%, 86%)'], [38, 'hsl(40, 92%, 51%)'],
    [55, 'hsl(49, 95%, 86%)'], [78, 'hsl(38, 75%, 33%)'], [100, 'hsl(40, 92%, 51%)'],
  ],
  iridescent: [
    [0, 'hsl(218, 17%, 48%)'], [18, 'hsl(326, 66%, 76%)'], [36, 'hsl(198, 82%, 72%)'],
    [52, 'hsl(220, 15%, 95%)'], [72, 'hsl(326, 66%, 76%)'], [88, 'hsl(198, 82%, 72%)'],
    [100, 'hsl(218, 17%, 48%)'],
  ],
};

const RARITY: Record<Rarity, { frame: FrameKind; stars: number; metal: Metal; holo: number }> = {
  common: { frame: 'neutral', stars: 1, metal: 'gray', holo: 0.06 },
  uncommon: { frame: 'neutral', stars: 2, metal: 'gray', holo: 0.06 },
  rare: { frame: 'neutral', stars: 3, metal: 'gray', holo: 0.12 },
  very_rare: { frame: 'gold', stars: 1, metal: 'gold', holo: 0.1 },
  ultra_rare: { frame: 'gold', stars: 2, metal: 'gold', holo: 0.18 },
  illustration_rare: { frame: 'gold', stars: 3, metal: 'gold', holo: 0.22 },
  // Mythique et Légendaire : alignées sur le voile allégé des fiches de l'app
  special_rare: { frame: 'mythic', stars: 1, metal: 'iridescent', holo: 0.16 },
  hyper_rare: { frame: 'legendary', stars: 2, metal: 'iridescent', holo: 0.22 },
};

/* Étoile identique au SVG de RarityBadge (boîte 12×12, bras épais).
   Le remplissage est créé dans l'espace transformé de l'étoile (boîte 12×12)
   pour que le dégradé métallique suive exactement l'angle du SVG. */
const STAR_PATH = 'M6 0 L7.88 3.41 L11.71 4.15 L9.05 6.99 L9.53 10.85 L6 9.2 L2.47 10.85 L2.95 6.99 L0.29 4.15 L4.12 3.41 Z';

const traceStar = (ctx: CanvasRenderingContext2D, sx: number, sy: number, k: number, metal: Metal) => {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(k, k);
  const grad = ctx.createLinearGradient(0, 0, 12, 12);
  METALS[metal].forEach(([pos, color]) => grad.addColorStop(pos / 100, color));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(15, 19, 30, 0.9)';
  ctx.fillStyle = grad;
  const path = new Path2D(STAR_PATH);
  ctx.stroke(path); // contour sombre sous le remplissage (paint-order: stroke fill)
  ctx.fill(path);
  ctx.restore();
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
  return img;
};

/** Dessine la photo en « cover » dans le rectangle donné. */
const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * ratio;
  const dh = img.naturalHeight * ratio;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

export const buildShareImage = async (card: AnimalCard): Promise<Blob> => {
  if (!card.image) throw new Error('no image');
  const img = await loadImage(card.image);
  const r = normalizeRarity(card.rarity);
  const theme = RARITY[r] ?? RARITY.common;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  // Fond
  ctx.fillStyle = '#0d0f0e';
  ctx.fillRect(0, 0, W, H);

  const pad = 26;
  const outerR = 64;

  // Cadre de rareté : dégradé métallique identique aux tuiles de l'app
  const frame = ctx.createLinearGradient(0, 0, W, H);
  FRAMES[theme.frame].forEach(([pos, color]) => frame.addColorStop(pos / 100, color));
  ctx.fillStyle = frame;
  roundRect(ctx, 0, 0, W, H, outerR);
  ctx.fill();

  // Zone photo
  const px = pad;
  const py = pad;
  const pw = W - pad * 2;
  const ph = H - pad * 2;
  const innerR = outerR - 18;

  ctx.save();
  roundRect(ctx, px, py, pw, ph, innerR);
  ctx.clip();

  drawCover(ctx, img, px, py, pw, ph);

  // ── Effet holographique figé ──────────────────────────────────────
  // Bandes arc-en-ciel diagonales
  const holo = ctx.createLinearGradient(px, py + ph, px + pw, py);
  const stops = ['#ff2f6a', '#ffb230', '#ffe94d', '#43e07a', '#39c2ff', '#8b5cf6', '#ff2f6a'];
  stops.forEach((c, i) => holo.addColorStop(i / (stops.length - 1), c));
  ctx.globalCompositeOperation = 'color-dodge';
  ctx.globalAlpha = theme.holo;
  ctx.fillStyle = holo;
  ctx.fillRect(px, py, pw, ph);

  // Second passage en overlay pour la profondeur des couleurs
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = theme.holo * 0.8;
  ctx.fillRect(px, py, pw, ph);

  // Glare diagonal (reflet de vitre)
  const glare = ctx.createLinearGradient(px, py, px + pw, py + ph);
  glare.addColorStop(0, 'rgba(255,255,255,0)');
  glare.addColorStop(0.38, 'rgba(255,255,255,0.05)');
  glare.addColorStop(0.5, 'rgba(255,255,255,0.42)');
  glare.addColorStop(0.62, 'rgba(255,255,255,0.05)');
  glare.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 1;
  ctx.fillStyle = glare;
  ctx.fillRect(px, py, pw, ph);

  // Halo lumineux vers le haut-gauche
  const shine = ctx.createRadialGradient(px + pw * 0.3, py + ph * 0.22, 0, px + pw * 0.3, py + ph * 0.22, pw * 0.9);
  shine.addColorStop(0, 'rgba(255,255,255,0.3)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = shine;
  ctx.fillRect(px, py, pw, ph);

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // ── Textes ────────────────────────────────────────────────────────
  // Dégradé sombre en bas pour la lisibilité
  const veil = ctx.createLinearGradient(0, py + ph - 420, 0, py + ph);
  veil.addColorStop(0, 'rgba(0,0,0,0)');
  veil.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  veil.addColorStop(1, 'rgba(0,0,0,0.86)');
  ctx.fillStyle = veil;
  ctx.fillRect(px, py + ph - 420, pw, 420);

  // Étoiles de rareté (haut droite) : mêmes symboles, métal et contour
  // sombre que les étoiles des cartes de l'app (RarityBadge, variante plain).
  {
    const k = 4; // 1 unité SVG = 4 px sur l'image finale
    const gap = 2;
    const pad = 1.2;
    const count = theme.stars;
    const rowW = (count * 12 + (count - 1) * gap + pad * 2) * k;
    const startX = px + pw - 34 - rowW;
    const startY = py + 34;
    for (let i = 0; i < count; i++) {
      const sx = startX + (pad + i * (12 + gap)) * k;
      const sy = startY + pad * k;
      traceStar(ctx, sx, sy, k, theme.metal);
    }
  }

  // Nom + nom scientifique
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 74px Sora, system-ui, sans-serif';
  let nameY = py + ph - 148;
  const name = card.name || '';
  if (ctx.measureText(name).width > pw - 100) {
    ctx.font = '800 56px Sora, system-ui, sans-serif';
  }
  ctx.fillText(name, px + 48, nameY);

  if (card.scientificName) {
    ctx.font = 'italic 400 36px Manrope, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(card.scientificName, px + 48, nameY + 50);
  }

  // Signature Faunex
  ctx.font = '700 30px Sora, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('🌿 FAUNEX', px + 48, py + ph - 52);

  ctx.restore();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
  });
};

export type ShareResult = 'shared' | 'downloaded';

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result);
      resolve(res.slice(res.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });

export type ShareTarget = 'stories' | 'instagram' | 'facebook' | 'whatsapp' | 'system' | 'download';

export const shareFileName = (card: AnimalCard) =>
  `faunex-${(card.name || 'capture').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;

export const shareText = (card: AnimalCard) => `J'ai capturé ${card.name} sur Faunex 🌿`;

export const shareLink = (card: AnimalCard) => {
  const origin = IS_NATIVE_APP ? 'https://faunex.fr' : window.location.origin;
  return `${origin}/collection?capture=${card.id}`;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** true si le plugin Capacitor est réellement embarqué dans le build natif. */
const nativePluginAvailable = (name: string): boolean => {
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  if (typeof cap.isPluginAvailable === 'function') return !!cap.isPluginAvailable(name);
  return true;
};

/** Annulation utilisateur de la feuille de partage : on considère l'action comme faite. */
const isShareCancelled = (err: unknown): boolean => {
  const message = `${(err as Error)?.name ?? ''} ${(err as Error)?.message ?? ''}`.toLowerCase();
  return message.includes('abort') || message.includes('cancel') || message.includes('annul');
};

/** Écrit l'image dans le cache natif et renvoie son URI (app Capacitor uniquement). */
const writeNativeFile = async (blob: Blob, fileName: string): Promise<string> => {
  const [{ Filesystem, Directory }] = await Promise.all([import('@capacitor/filesystem')]);
  const data = await blobToBase64(blob);
  const written = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
  return written.uri;
};


const openExternal = async (url: string) => {
  if (IS_NATIVE_APP) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Partage la carte vers une cible précise.
 * Instagram / Stories ne proposent aucune API web : on passe par la feuille de
 * partage système sur mobile (l'utilisateur choisit Instagram ou Stories),
 * et par le téléchargement de l'image sur desktop.
 */
export const shareCaptureTo = async (card: AnimalCard, target: ShareTarget, blob?: Blob): Promise<ShareResult> => {
  const image = blob ?? (await buildShareImage(card));
  const fileName = shareFileName(card);
  const text = shareText(card);
  const link = shareLink(card);

  if (target === 'download') {
    downloadBlob(image, fileName);
    return 'downloaded';
  }

  // ── App native ────────────────────────────────────────────────────
  // Si le plugin natif est absent ou échoue (fichier illisible, feuille
  // annulée par le système…), on retombe sur le partage web / le
  // téléchargement plutôt que de laisser le bouton sans effet.
  if (IS_NATIVE_APP && nativePluginAvailable('Share')) {
    try {
      const { Share } = await import('@capacitor/share');
      const joinLink = target === 'facebook' || target === 'whatsapp';
      const message = joinLink ? `${text} ${link}` : text;

      let files: string[] | undefined;
      if (nativePluginAvailable('Filesystem')) {
        try {
          files = [await writeNativeFile(image, fileName)];
        } catch (err) {
          console.warn('[share] écriture du fichier impossible', err);
        }
      }

      await Share.share({
        title: 'Faunex',
        text: message,
        url: files ? undefined : link,
        files,
        dialogTitle: 'Partager ta carte',
      });
      return 'shared';
    } catch (err) {
      if (isShareCancelled(err)) return 'shared';
      console.warn('[share] partage natif indisponible, repli web', err);
    }
  }


  // ── Web ───────────────────────────────────────────────────────────
  const file = new File([image], fileName, { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  const canShareFile = !!nav.share && !!nav.canShare?.({ files: [file] });

  if (target === 'facebook') {
    if (canShareFile) {
      try {
        await nav.share({ files: [file], title: 'Faunex', text });
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return 'shared';
      }
    }
    downloadBlob(image, fileName);
    await openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`);
    return 'downloaded';
  }

  if (target === 'whatsapp') {
    if (canShareFile) {
      try {
        await nav.share({ files: [file], title: 'Faunex', text });
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return 'shared';
      }
    }
    await openExternal(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`);
    return 'shared';
  }

  // Instagram / Stories / système
  if (canShareFile) {
    try {
      await nav.share({ files: [file], title: 'Faunex', text });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'shared';
    }
  }

  downloadBlob(image, fileName);
  return 'downloaded';
};

/** Partage la carte : feuille de partage native (iOS/Android), sinon Web Share, sinon téléchargement. */
export const shareCapture = async (card: AnimalCard): Promise<ShareResult> =>
  shareCaptureTo(card, 'system');


