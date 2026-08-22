import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressForAI, dataUrlBytes, hashDataUrl } from '@/lib/imageProcessing';
import type { AnimalResult } from '@/types/capture';
import { logDatasetEvent, setPendingImageHash } from '@/lib/dataset';

/** Motifs de refus explicites (l'utilisateur peut toujours demander une modération). */
export type RejectionKind = 'representation' | 'internet' | 'human';

type IdentifyOutcome =
  | { status: 'identified'; animal: AnimalResult }
  | { status: 'unknown'; hint?: string }
  | { status: 'rejected'; kind: RejectionKind; title: string; message: string }
  | { status: 'error'; message: string };

/** Libellés lisibles des types d'images non photographiques refusés. */
const IMAGE_TYPE_LABELS: Record<string, string> = {
  illustration: 'une illustration',
  dessin: 'un dessin',
  logo_icone: 'un logo ou une icône',
  peinture: 'une peinture',
  rendu_3d: 'une image de synthèse',
  image_generee_ia: 'une image générée par IA',
  capture_ecran: "une capture d'écran",
  photo_ecran_ou_papier: "la photo d'un écran ou d'une image imprimée",
  jouet_peluche_figurine: 'un jouet, une peluche ou une figurine',
  objet_representation: 'un objet représentant un animal (statue, décoration, souvenir…)',
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
    const timer = setTimeout(() => reject(new Error("TIMEOUT: l'analyse a pris trop de temps")), ms);
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

export const useAnimalIdentification = () => {
  const [identifying, setIdentifying] = useState(false);
  const [stage, setStage] = useState<IdentifyStage>('idle');
  const cacheRef = useRef<Map<string, Promise<IdentifyOutcome>>>(new Map());

  const identify = useCallback(async (dataUrl: string): Promise<IdentifyOutcome> => {
    setIdentifying(true);
    setStage('compressing');
    try {
      // 1024px / 0.62 : nécessaire pour les détails fins (points des coccinelles,
      // miroir fessier des cervidés) qui étaient perdus à 640px.
      let compressedUrl = await compressForAI(dataUrl, 1024, 0.62);
      // Garde-fou : une photo très détaillée peut rester lourde après le premier
      // passage. Au-delà de ~1,2 Mo l'upload devient le goulot d'étranglement,
      // on repasse alors en 820px / 0.55 (toujours suffisant pour l'IA).
      if (dataUrlBytes(compressedUrl) > 1_200_000) {
        compressedUrl = await compressForAI(compressedUrl, 820, 0.55);
      }
      const imageHash = await hashDataUrl(compressedUrl);

      setPendingImageHash(imageHash);

      const cached = cacheRef.current.get(imageHash);
      if (cached) return await cached;

      const run = async (): Promise<IdentifyOutcome> => {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          setStage(attempt === 0 ? 'analyzing' : 'retrying');
          try {
            const { data, error } = await withTimeout(
              supabase.functions.invoke('identify-animal', {
                body: { imageBase64: compressedUrl },
              }),
              // Le serveur est borné à ~44 s (2 passes Lite + 1 passe Flash) :
              // au-delà la requête est perdue, on relance immédiatement.
              50_000,
            );
            if (error) throw error;


            // Image non photographique (illustration, logo, dessin, capture
            // d'écran…) : refus net, sans bascule vers la saisie manuelle pour
            // ne pas laisser passer un faux positif en modération.
            if (data?.reason === 'not_a_real_photo') {
              const label = IMAGE_TYPE_LABELS[String(data?.image_type ?? '')] ?? 'une image graphique';
              return {
                status: 'not_photo',
                message: `Cette image semble être ${label}, pas une photo d'animal prise sur le terrain. Faunex n'accepte que de vraies photographies : prends une photo de l'animal réel pour l'ajouter à ta collection.`,
              };
            }

            const animal = data?.success ? (data.animal as AnimalResult | undefined) : undefined;



            if (!animal || !animal.animal_name) {
              // Réponse valide mais sans animal exploitable → vraie non-reconnaissance.
              // `hint` porte le repli taxonomique honnête (genre / famille) quand le
              // serveur a rejeté une espèce non validée.
              return { status: 'unknown', hint: typeof data?.hint === 'string' ? data.hint : undefined };
            }
            if (
              animal.animal_name.toLowerCase() === 'inconnu' ||
              isHuman(animal) ||
              isFictionalOrExtinct(animal)
            ) {
              return { status: 'unknown' };
            }
            // Dataset : on archive la prédiction brute du modèle (jamais une
            // vérité terrain) pour pouvoir la comparer plus tard au label retenu.
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
            return { status: 'identified', animal };
          } catch (err) {
            lastError = err;
            console.error('identify-animal attempt failed', attempt, err);
            if (attempt === 0) await sleep(1200);
          }
        }

        const raw = JSON.stringify((lastError as any)?.message ?? lastError ?? '');
        const message = raw.includes('TIMEOUT')
          ? "L'analyse a été trop longue (connexion lente). Réessaie."
          : raw.includes('429')
            ? "L'IA est surchargée, réessaie dans quelques secondes."
            : raw.includes('402')
              ? "Le service d'identification est momentanément indisponible."
              : "L'analyse a échoué (connexion ou serveur). Réessaie.";

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
      return outcome;
    } catch (err) {
      console.error('identify failed', err);
      return { status: 'error', message: "L'analyse a échoué. Réessaie." };
    } finally {
      setIdentifying(false);
      setStage('idle');
    }
  }, []);


  return { identifying, stage, identify };

};
