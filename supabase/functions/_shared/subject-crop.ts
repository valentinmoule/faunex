import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

export type Bbox = { x: number; y: number; w: number; h: number };

const PRECISE_RANKS = new Set(["species", "subspecies"]);

/**
 * Un sujet minuscule dans le cadre (insecte au loin, oiseau dans un arbre)
 * perd ses caractères diagnostiques : le modèle facture un forfait d'image
 * fixe et réduit la photo entière à la même résolution effective. Recadrer
 * sur le sujet donne toute cette résolution à l'animal, au même prix d'image.
 */
export function shouldZoomOnSubject(data: any): boolean {
  const b = data?.subject_bbox as Bbox | undefined;
  if (!b || ![b.x, b.y, b.w, b.h].every((v) => typeof v === "number" && v >= 0 && v <= 1)) return false;
  if (b.w <= 0 || b.h <= 0 || b.w * b.h > 0.15) return false;
  const confidence = typeof data?.confidence === "number" ? data.confidence : 0;
  const rank = String(data?.scientific_rank ?? "");
  const scientific = String(data?.scientific_name ?? "").trim();
  const vagueScientific = scientific.length > 0 && !/\s/.test(scientific);
  return confidence < 80 || (rank ? !PRECISE_RANKS.has(rank) : vagueScientific);
}

/** Recadre une data URL JPEG/PNG sur la boîte du sujet, avec une marge. */
export async function cropToSubject(dataUrl: string, b: Bbox): Promise<string | null> {
  const m = dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
  const img = await Image.decode(bytes);
  const margin = 0.6;
  const cx = (b.x + b.w / 2) * img.width;
  const cy = (b.y + b.h / 2) * img.height;
  const side = Math.max(b.w * img.width, b.h * img.height) * (1 + margin);
  const size = Math.max(160, Math.min(side, img.width, img.height));
  const x = Math.round(Math.min(Math.max(cx - size / 2, 0), img.width - size));
  const y = Math.round(Math.min(Math.max(cy - size / 2, 0), img.height - size));
  const s = Math.round(size);
  if (s < 64) return null;
  const cropped = img.crop(x, y, s, s);
  const out = await cropped.encodeJPEG(85);
  let bin = "";
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return `data:image/jpeg;base64,${btoa(bin)}`;
}

/** Le résultat zoomé remplace le premier s'il est plus précis ou plus sûr. */
export function zoomIsBetter(before: any, after: any): boolean {
  if (!after?.animal_name || String(after.animal_name).toLowerCase() === "inconnu") return false;
  if (after.is_real_photo === false) return false;
  const c0 = typeof before?.confidence === "number" ? before.confidence : 0;
  const c1 = typeof after?.confidence === "number" ? after.confidence : 0;
  const precise = (d: any) => PRECISE_RANKS.has(String(d?.scientific_rank ?? "")) ||
    (!d?.scientific_rank && /\s/.test(String(d?.scientific_name ?? "").trim()));
  if (precise(after) && !precise(before)) return c1 >= 55;
  return c1 >= c0 + 10;
}
