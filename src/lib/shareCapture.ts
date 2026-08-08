/**
 * Génère une image partageable d'une capture : photo + cadre de rareté +
 * effet holographique « figé » (arc-en-ciel + glare diagonal, sans parallaxe).
 *
 * Tout est peint au canvas 2D : rendu identique sur tous les navigateurs,
 * aucune dépendance, et le résultat peut être partagé via l'API Web Share.
 */
import type { AnimalCard, Rarity } from '@/data/mockData';

const W = 1080;
const H = 1350;

const RARITY: Record<Rarity, { border: [string, string, string]; label: string; holo: number }> = {
  common: { border: ['#9aa2a8', '#c9d1d6', '#7d858b'], label: 'Commun', holo: 0.1 },
  rare: { border: ['#3b82f6', '#93c5fd', '#1d4ed8'], label: 'Rare', holo: 0.22 },
  epic: { border: ['#a855f7', '#e9d5ff', '#6d28d9'], label: 'Épique', holo: 0.34 },
  mythic: { border: ['#e0a53a', '#fff0c0', '#a9741a'], label: 'Mythique', holo: 0.42 },
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
  const theme = RARITY[card.rarity] ?? RARITY.common;

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

  // Cadre de rareté (dégradé continu)
  const frame = ctx.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, theme.border[0]);
  frame.addColorStop(0.45, theme.border[1]);
  frame.addColorStop(1, theme.border[2]);
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

  // Badge rareté (haut droite)
  ctx.font = '700 30px Sora, system-ui, sans-serif';
  const badge = theme.label.toUpperCase();
  const bw = ctx.measureText(badge).width + 52;
  const bx = px + pw - bw - 34;
  const by = py + 34;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  roundRect(ctx, bx, by, bw, 62, 31);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, bw, 62, 31);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, bx + 26, by + 33);

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

/** Partage la carte via l'API Web Share, sinon télécharge l'image. */
export const shareCapture = async (card: AnimalCard): Promise<ShareResult> => {
  const blob = await buildShareImage(card);
  const fileName = `faunex-${(card.name || 'capture').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
  const file = new File([blob], fileName, { type: 'image/jpeg' });

  const text = `J'ai capturé ${card.name} sur Faunex 🌿`;
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: 'Faunex', text });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
};
