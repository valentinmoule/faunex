import { useCallback, useRef, useState } from 'react';
import i18n from '@/i18n';
import { supabase } from '@/integrations/supabase/client';
import { compressForAI, dataUrlBytes, hashDataUrl } from '@/lib/imageProcessing';
import type { AnimalResult } from '@/types/capture';
import { logDatasetEvent, setPendingImageHash } from '@/lib/dataset';
import { hapticSuccess } from '@/lib/haptics';

/** Motifs de refus explicites (l'utilisateur peut toujours demander une modération). */
export type RejectionKind = 'representation' | 'internet' | 'human' | 'dead';

type IdentifyOutcome =
  | { status: 'identified'; animal: AnimalResult }
  | { status: 'unknown'; hint?: string }
  | { status: 'rejected'; kind: RejectionKind; title: string; message: string }
  | { status: 'error'; message: string };

/** Clés i18n des types d'images non photographiques refusés (capture.imageTypes.*). */
const IMAGE_TYPE_LABEL_KEYS: Record<string, string> = {
  illustration: 'illustration',
  dessin: 'dessin',
  logo_icone: 'logo_icone',
  peinture: 'peinture',
  rendu_3d: 'rendu_3d',
  image_generee_ia: 'image_generee_ia',
  capture_ecran: 'capture_ecran',
  photo_ecran_ou_papier: 'photo_ecran_ou_papier',
  jouet_peluche_figurine: 'jouet_peluche_figurine',
  objet_representation: 'objet_representation',
  animal_mort_ou_plat: 'animal_mort_ou_plat',
};

/** Types d'images qui trahissent une photo récupérée en ligne plutôt qu'une observation. */
const INTERNET_IMAGE_TYPES = ['capture_ecran', 'photo_ecran_ou_papier', 'image_generee_ia'];



const normalize = (v?: string | null) =>
  (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const HUMAN_NAMES = [
  'humain',
  'etre humain',
  'homme',
  'femme',
  'enfant',
  'personne',
  'human',
  'homo sapiens',
  'selfie',
  'visage',
];

/** L'être humain n'est jamais une capture valide. */
const isHuman = (animal: { animal_name?: string; scientific_name?: string; category?: string }) => {
  const name = normalize(animal.animal_name);
  const sci = normalize(animal.scientific_name);
  if (sci.includes('homo sapiens') || sci === 'homo') return true;
  return HUMAN_NAMES.some((h) => name === h || name.includes(h));
};

/** Créatures de fiction et espèces éteintes : jamais des captures valides. */
const FICTIONAL_NAMES = [
  'licorne',
  'phenix',
  'griffon',
  'kraken',
  'sirene',
  'yeti',
  'chimere',
  'pokemon',
  'wyvern',
  'basilic',
  'hydre',
  'centaure',
  'pegase',
];

const EXTINCT_NAMES = [
  'dodo',
  'tyrannosaure',
  'tyrannosaurus',
  'dinosaure',
  'velociraptor',
  'mammouth',
  'thylacine',
  'tigre de tasmanie',
  'grand pingouin',
  'aurochs',
  'smilodon',
  'tigre a dents de sabre',
  'moa',
  'ptérodactyle',
  'pterodactyle',
];

const EXTINCT_SCIENTIFIC = [
  'raphus cucullatus',
  'tyrannosaurus',
  'mammuthus',
  'thylacinus',
  'pinguinus impennis',
  'smilodon',
  'creatura',
];

/** Une espèce réelle peut contenir "dragon" (Komodo, barbu, volant) : on ne bloque
 *  que si le nom scientifique n'est pas un binôme latin plausible. */
const isFictionalOrExtinct = (animal: { animal_name?: string; scientific_name?: string }) => {
  const name = normalize(animal.animal_name);
  const sci = normalize(animal.scientific_name);
  if (EXTINCT_SCIENTIFIC.some((s) => sci.includes(s))) return true;
  if (FICTIONAL_NAMES.some((f) => name.includes(f))) return true;
  if (EXTINCT_NAMES.some((e) => name.includes(e))) return true;
  if (name.includes('dragon')) {
    const realDragons = ['komodo', 'barbu', 'volant', 'pogona', 'varanus', 'draco'];
    const looksReal = realDragons.some((r) => name.includes(r) || sci.includes(r));
    if (!looksReal) return true;
  }
  return false;
};


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Empêche une analyse de rester bloquée indéfiniment (réseau mobile instable). */
const withTimeout = <T,>(promise: PromiseLike<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT: ' + i18n.t('capture.errors.analysisTimeout'))), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });


/**
 * Single source of truth for the AI identification flow.
 * Used identically by the camera shot and the gallery import.
 *
 * A network/AI failure is NOT the same thing as "animal non reconnu":
 * transient errors are retried once and then surfaced as `error` so the user
 * can retry instead of being pushed into the manual moderation queue.
 *
 * Cost optimisations:
 * - Images are compressed to 640px / quality 0.5 before upload (keeps accuracy
 *   high for common animals while reducing token cost).
 * - Results for identical images are cached in-memory for the session to avoid
 *   double-billing when the user retries the same photo.
 */
export type IdentifyStage = 'idle' | 'compressing' | 'analyzing' | 'retrying';

/**
 * Cache/verrou d'analyse partagé par TOUTE l'application (module-level, pas par
 * instance de hook) : un double clic, un remontage de la page capture ou un
 * retry sur la même photo réutilisent l'analyse en cours au lieu de lancer un
 * second appel IA facturé.
 */
const inFlight = new Map<string, Promise<IdentifyOutcome>>();

/**
 * Cache persistant local (30 jours) des résultats déjà obtenus, indexé par
 * empreinte d'image. Une même photo relancée après un rechargement de page, un
 * retour arrière ou une réinstallation ne déclenche AUCUN appel réseau ni IA.
 */
const LOCAL_CACHE_KEY = 'faunex.identify.cache.v1';
const LOCAL_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const LOCAL_CACHE_MAX = 60;

type LocalCacheEntry = { at: number; outcome: IdentifyOutcome };

const readLocalCache = (): Record<string, LocalCacheEntry> => {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LocalCacheEntry>) : {};
  } catch {
    return {};
  }
};

const getLocalOutcome = (hash: string): IdentifyOutcome | null => {
  const entry = readLocalCache()[hash];
  if (!entry || Date.now() - entry.at > LOCAL_CACHE_TTL) return null;
  return entry.outcome;
};

/** Seuls les verdicts stables sont mémorisés (jamais une erreur réseau). */
const setLocalOutcome = (hash: string, outcome: IdentifyOutcome) => {
  if (outcome.status === 'error') return;
  try {
    const store = readLocalCache();
    store[hash] = { at: Date.now(), outcome };
    const entries = Object.entries(store)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, LOCAL_CACHE_MAX);
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* quota localStorage plein : le cache serveur reste actif */
  }
};


export const useAnimalIdentification = () => {
  const [identifying, setIdentifying] = useState(false);
  const [stage, setStage] = useState<IdentifyStage>('idle');
  const cacheRef = useRef(inFlight);

  const identify = useCallback(async (dataUrl: string): Promise<IdentifyOutcome> => {
    setIdentifying(true);
    setStage('compressing');
    try {
      // 1024px / 0.62 : réservé à la passe profonde (détails fins : points des
      // coccinelles, miroir fessier des cervidés).
      let compressedUrl = await compressForAI(dataUrl, 1024, 0.62);
      // Garde-fou : une photo très détaillée peut rester lourde après le premier
      // passage. Au-delà de ~1,2 Mo l'upload devient le goulot d'étranglement,
      // on repasse alors en 820px / 0.55 (toujours suffisant pour l'IA).
      if (dataUrlBytes(compressedUrl) > 1_200_000) {
        compressedUrl = await compressForAI(compressedUrl, 820, 0.55);
      }
      // Une image coûte un forfait fixe de jetons quelle que soit sa taille :
      // réduire davantage la résolution n'économiserait rien et dégraderait la
      // détection. On envoie donc une seule image.
      const imageHash = await hashDataUrl(compressedUrl);

      setPendingImageHash(imageHash);

      const cached = cacheRef.current.get(imageHash);
      if (cached) return await cached;

      // 1) Cache local persistant : même photo déjà identifiée sur cet appareil
      //    → aucun réseau, aucun appel IA.
      const local = getLocalOutcome(imageHash);
      if (local) {
        if (local.status === 'identified') hapticSuccess();
        return local;
      }

      /** Traduction d'une réponse serveur (fraîche ou issue du cache) en verdict. */
      const interpret = (data: any): IdentifyOutcome => {
        // Quota d'analyses IA quotidien atteint : message explicite, aucune
        // relance (une nouvelle tentative serait refusée à l'identique).
        if (data?.reason === 'daily_limit') {
          return {
            status: 'error',
            message:
              typeof data?.message === 'string'
                ? data.message
                : i18n.t('capture.errors.dailyAnalysisLimit'),
          };
        }

        // Image non photographique : refus explicite et assumé. L'utilisateur
        // garde la possibilité de demander une modération humaine.
        if (data?.reason === 'not_a_real_photo') {
          const imageType = String(data?.image_type ?? '');
          const labelKey = IMAGE_TYPE_LABEL_KEYS[imageType] ?? 'default';
          const label = i18n.t(`capture.imageTypes.${labelKey}`);
          if (imageType === 'animal_mort_ou_plat') {
            return {
              status: 'rejected',
              kind: 'dead',
              title: i18n.t('capture.rejected.dead.title'),
              message: i18n.t('capture.rejected.dead.message'),
            };
          }
          if (INTERNET_IMAGE_TYPES.includes(imageType)) {
            return {
              status: 'rejected',
              kind: 'internet',
              title: i18n.t('capture.rejected.internet.title'),
              message: i18n.t('capture.rejected.internet.message', { label }),
            };
          }
          return {
            status: 'rejected',
            kind: 'representation',
            title: i18n.t('capture.rejected.representation.title'),
            message: i18n.t('capture.rejected.representation.message', { label }),
          };
        }

        const animal = data?.success ? (data.animal as AnimalResult | undefined) : undefined;

        if (!animal || !animal.animal_name) {
          // Réponse valide mais sans animal exploitable → vraie non-reconnaissance.
          // `hint` porte le repli taxonomique honnête (genre / famille) quand le
          // serveur a rejeté une espèce non validée.
          return { status: 'unknown', hint: typeof data?.hint === 'string' ? data.hint : undefined };
        }
        if (isHuman(animal)) {
          return {
            status: 'rejected',
            kind: 'human',
            title: i18n.t('capture.rejected.human.title'),
            message: i18n.t('capture.rejected.human.message'),
          };
        }
        if (
          animal.animal_name.toLowerCase() === 'inconnu' ||
          isFictionalOrExtinct(animal)
        ) {
          return { status: 'unknown' };
        }

        // Dataset : on archive la prédiction brute du modèle (jamais une
        // vérité terrain) pour pouvoir la comparer plus tard au label retenu.
        if (!data?.cached) {
          void logDatasetEvent({
            event_type: 'ai_prediction',
            source: 'client',
            image_hash: imageHash,
            predicted_name: animal.animal_name,
            predicted_scientific_name: animal.scientific_name ?? null,
            predicted_category: animal.category ?? null,
            predicted_rarity: animal.rarity ?? null,
            confidence: animal.confidence ?? null,
            alternatives: animal.alternatives ?? null,
            subject_bbox: animal.subject_bbox ?? null,
          });
        }
        hapticSuccess();
        return { status: 'identified', animal };
      };

      const run = async (): Promise<IdentifyOutcome> => {
        // 2) Sonde par empreinte : on demande d'abord au serveur s'il connaît
        //    déjà cette photo. Aucun téléversement, aucun quota, aucun appel IA.
        setStage('analyzing');
        try {
          const probe = await withTimeout(
            supabase.functions.invoke('identify-animal', {
              body: { imageHash, probe: true },
            }),
            8_000,
          );
          const probeData = probe?.data as any;
          if (!probe?.error && probeData && probeData.reason !== 'cache_miss') {
            return interpret(probeData);
          }
        } catch (err) {
          console.warn('identify probe skipped', err);
        }

        // Conservé entre les deux appels : le backend traite un retry réseau
        // comme la même analyse et ne débite donc jamais deux fois le quota.
        const requestId = crypto.randomUUID();
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          setStage(attempt === 0 ? 'analyzing' : 'retrying');
          try {
            const { data, error } = await withTimeout(
              supabase.functions.invoke('identify-animal', {
                body: { imageBase64: compressedUrl, requestId, imageHash },
              }),
              // Le serveur est borné à ~44 s : au-delà la requête est perdue,
              // on relance immédiatement.
              50_000,
            );
            if (error) throw error;
            return interpret(data);
          } catch (err) {
            lastError = err;
            console.error('identify-animal attempt failed', attempt, err);
            // Une erreur définitive (surcharge, crédits, refus) ne doit JAMAIS
            // être relancée : la seconde tentative serait refusée à l'identique
            // tout en risquant un appel IA facturé de plus.
            const raw = JSON.stringify((err as any)?.message ?? err ?? '');
            const terminal = /40[023]|429/.test(raw);
            if (terminal || attempt === 1) break;
            await sleep(1200);
          }
        }

        const raw = JSON.stringify((lastError as any)?.message ?? lastError ?? '');
        const message = raw.includes('TIMEOUT')
          ? i18n.t('capture.errors.analysisTooSlow')
          : raw.includes('429')
            ? i18n.t('capture.errors.aiOverloaded')
            : raw.includes('402')
              ? i18n.t('capture.errors.serviceUnavailable')
              : i18n.t('capture.errors.analysisFailedGeneric');

        return { status: 'error', message };
      };

      const promise = run();
      cacheRef.current.set(imageHash, promise);
      // On attend le résultat ici : sinon `identifying` retombait à false
      // immédiatement (le finally s'exécutait avant la résolution) et l'UI
      // n'affichait plus aucun indicateur d'analyse.
      const outcome = await promise;
      // Un échec ou une non-reconnaissance ne doit jamais être mis en cache,
      // sinon une nouvelle tentative sur la même image ne relance rien.
      if (outcome.status !== 'identified') cacheRef.current.delete(imageHash);
      // Verdicts stables mémorisés localement (identification, refus explicite).
      if (outcome.status === 'identified' || outcome.status === 'rejected') {
        setLocalOutcome(imageHash, outcome);
      }
      return outcome;

    } catch (err) {
      console.error('identify failed', err);
      return { status: 'error', message: i18n.t('capture.errors.analysisFailed') };
    } finally {
      setIdentifying(false);
      setStage('idle');
    }
  }, []);


  return { identifying, stage, identify };

};
