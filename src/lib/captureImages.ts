import { supabase } from '@/integrations/supabase/client';

/**
 * Le bucket "captures" est privé : les URLs stockées en base pointent vers
 * l'ancien chemin public. On les convertit en URLs signées (valides 1h) au
 * moment de l'affichage. Les accès sont contrôlés par les règles RLS du
 * storage (propriétaire, ou capture approuvée + partagée + profil public).
 */

const PUBLIC_MARKER = '/storage/v1/object/public/captures/';
const SIGN_MARKER = '/storage/v1/object/sign/captures/';
const TTL_SECONDS = 3600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

/** Extrait le chemin objet ("uid/123.jpg") d'une URL stockée. */
export function toStoragePath(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;
  for (const marker of [PUBLIC_MARKER, SIGN_MARKER]) {
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const raw = url.slice(idx + marker.length).split('?')[0];
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

function fromCache(path: string): string | null {
  const hit = cache.get(path);
  if (hit && hit.expiresAt - REFRESH_MARGIN_MS > Date.now()) return hit.url;
  return null;
}

async function signMany(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { data, error } = await supabase.storage
    .from('captures')
    .createSignedUrls(paths, TTL_SECONDS);
  if (error || !data) return;
  const expiresAt = Date.now() + TTL_SECONDS * 1000;
  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) {
      cache.set(entry.path, { url: entry.signedUrl, expiresAt });
    }
  });
}

/** Signe une seule URL d'image de capture. */
export async function signCaptureUrl(url?: string | null): Promise<string | null> {
  const path = toStoragePath(url);
  if (!path) return url ?? null;
  const cached = fromCache(path);
  if (cached) return cached;

  const existing = inflight.get(path);
  if (existing) return existing;

  const promise = (async () => {
    await signMany([path]);
    return fromCache(path) ?? null;
  })().finally(() => inflight.delete(path));

  inflight.set(path, promise);
  return promise;
}

/**
 * Remplace `image_url` par une URL signée sur une liste d'enregistrements.
 * Les lignes sans image ou déjà signées sont laissées telles quelles.
 */
export async function signCaptureRows<T extends { image_url?: string | null }>(
  rows: T[] | null | undefined
): Promise<T[]> {
  if (!rows || rows.length === 0) return rows ?? [];

  const needed = new Set<string>();
  rows.forEach((row) => {
    const path = toStoragePath(row.image_url);
    if (path && !fromCache(path)) needed.add(path);
  });

  const pending = [...needed];
  for (let i = 0; i < pending.length; i += 100) {
    await signMany(pending.slice(i, i + 100));
  }

  return rows.map((row) => {
    const path = toStoragePath(row.image_url);
    if (!path) return row;
    const signed = fromCache(path);
    return signed ? { ...row, image_url: signed } : row;
  });
}
