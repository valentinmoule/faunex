import { lazy, type ComponentType } from 'react';
import { isChunkLoadError } from './appRecovery';

/**
 * Chargement d'un écran avec récupération automatique.
 *
 * Symptôme visé : après une mise à jour, une app installée peut garder en cache
 * un ancien index.html. Les écrans chargés à la demande (carte, explorateurs,
 * profil…) pointent alors vers des fichiers qui n'existent plus : l'écran reste
 * blanc. Ici, on retente une fois, puis on purge caches + service worker et on
 * recharge la page en contournant le cache.
 */
const PURGE_KEY = 'faunex_chunk_purge';

/** Purge caches + service worker puis recharge. Renvoie false quand aucun
 *  rechargement n'a pu être déclenché (purge déjà tentée dans la session,
 *  stockage bloqué en navigation privée…) : l'appelant doit alors laisser
 *  remonter l'erreur pour afficher un écran d'erreur, et non attendre. */
const purgeAndReload = async (): Promise<boolean> => {
  try {
    if (sessionStorage.getItem(PURGE_KEY) === '1') return false;
    sessionStorage.setItem(PURGE_KEY, '1');
  } catch {
    /* stockage indisponible : on tente quand même un rechargement unique */
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {
    /* noop */
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {
    /* noop */
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now().toString(36));
    window.location.replace(url.toString());
    return true;
  } catch {
    try {
      window.location.reload();
      return true;
    } catch {
      return false;
    }
  }
};

export const lazyWithRetry = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;

      // Deuxième tentative : un simple aléa réseau se résout souvent ainsi.
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (retryError) {
        const reloading = await purgeAndReload();
        // Rechargement en cours : on garde la promesse en attente.
        if (reloading) return await new Promise<{ default: T }>(() => {});
        // Sinon on remonte l'erreur pour que l'écran d'erreur s'affiche
        // (avec son bouton de rechargement) au lieu d'un chargement infini.
        throw retryError;
      }
    }
  });


export default lazyWithRetry;
