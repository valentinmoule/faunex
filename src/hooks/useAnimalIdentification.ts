import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressForAI, hashDataUrl } from '@/lib/imageProcessing';
import type { AnimalResult } from '@/types/capture';

type IdentifyOutcome =
  | { status: 'identified'; animal: AnimalResult }
  | { status: 'unknown' }
  | { status: 'error'; message: string };

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
export const useAnimalIdentification = () => {
  const [identifying, setIdentifying] = useState(false);
  const cacheRef = useRef<Map<string, Promise<IdentifyOutcome>>>(new Map());

  const identify = useCallback(async (dataUrl: string): Promise<IdentifyOutcome> => {
    setIdentifying(true);
    try {
      const compressedUrl = await compressForAI(dataUrl, 640, 0.5);
      const imageHash = await hashDataUrl(compressedUrl);

      const cached = cacheRef.current.get(imageHash);
      if (cached) return cached;

      const run = async (): Promise<IdentifyOutcome> => {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const { data, error } = await supabase.functions.invoke('identify-animal', {
              body: { imageBase64: compressedUrl },
            });
            if (error) throw error;

            const animal = data?.success ? (data.animal as AnimalResult | undefined) : undefined;
            if (!animal || !animal.animal_name) {
              // Réponse valide mais sans animal exploitable → vraie non-reconnaissance
              return { status: 'unknown' };
            }
            if (animal.animal_name.toLowerCase() === 'inconnu' || isHuman(animal)) {
              return { status: 'unknown' };
            }
            return { status: 'identified', animal };
          } catch (err) {
            lastError = err;
            console.error('identify-animal attempt failed', attempt, err);
            if (attempt === 0) await sleep(1200);
          }
        }

        const raw = JSON.stringify((lastError as any)?.message ?? lastError ?? '');
        const message = raw.includes('429')
          ? "L'IA est surchargée, réessaie dans quelques secondes."
          : raw.includes('402')
            ? "Le service d'identification est momentanément indisponible."
            : "L'analyse a échoué (connexion ou serveur). Réessaie.";
        return { status: 'error', message };
      };

      const promise = run();
      cacheRef.current.set(imageHash, promise);
      return promise;
    } finally {
      setIdentifying(false);
    }
  }, []);

  return { identifying, identify };
};
