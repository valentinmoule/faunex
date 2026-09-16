/**
 * Filet de sécurité au démarrage.
 *
 * Symptôme visé : après un déploiement, une app installée (PWA / iOS) peut
 * servir un ancien index.html depuis le cache alors que les fichiers de code
 * correspondants n'existent plus. Le chargement d'un écran échoue alors et
 * l'utilisateur voit une page blanche, sans moyen de s'en sortir.
 *
 * Ici on détecte ce cas précis (échec de chargement d'un module) puis on purge
 * les caches, on désinscrit le service worker et on recharge — une seule fois
 * par session, pour ne jamais boucler.
 */
const RECOVERY_KEY = 'faunex_recovery_attempt';

const alreadyTried = (): boolean => {
  try {
    return sessionStorage.getItem(RECOVERY_KEY) === '1';
  } catch {
    return true;
  }
};

const markTried = () => {
  try {
    sessionStorage.setItem(RECOVERY_KEY, '1');
  } catch {
    /* noop */
  }
};

export const isChunkLoadError = (reason: unknown): boolean => {
  const message =
    typeof reason === 'string'
      ? reason
      : reason && typeof reason === 'object' && 'message' in reason
        ? String((reason as { message?: unknown }).message ?? '')
        : '';
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|ChunkLoadError|Loading chunk|Unable to preload|error loading dynamically imported module/i.test(
    message,
  );
};

export const recoverFromStaleBuild = async (): Promise<void> => {
  if (alreadyTried()) return;
  markTried();

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

  window.location.reload();
};

/** Écoute globale : un import de module qui échoue déclenche la récupération. */
export const setupStaleBuildRecovery = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    if (isChunkLoadError(event.message) || isChunkLoadError(event.error)) {
      void recoverFromStaleBuild();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      void recoverFromStaleBuild();
    }
  });
};
