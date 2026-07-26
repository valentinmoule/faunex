import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressForAI } from '@/lib/imageProcessing';
import type { AnimalResult } from '@/types/capture';

type IdentifyOutcome =
  | { status: 'identified'; animal: AnimalResult }
  | { status: 'unknown' };

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

/**
 * Single source of truth for the AI identification flow.
 * Used identically by the camera shot and the gallery import.
 */
export const useAnimalIdentification = () => {
  const [identifying, setIdentifying] = useState(false);

  const identify = useCallback(async (dataUrl: string): Promise<IdentifyOutcome> => {
    setIdentifying(true);
    try {
      const compressedUrl = await compressForAI(dataUrl, 1024, 0.6);
      const { data, error } = await supabase.functions.invoke('identify-animal', {
        body: { imageBase64: compressedUrl },
      });
      if (error) throw error;
      const animal = data?.success ? (data.animal as AnimalResult | undefined) : undefined;
      if (!animal || !animal.animal_name || animal.animal_name.toLowerCase() === 'inconnu') {
        return { status: 'unknown' };
      }
      if (isHuman(animal)) {
        return { status: 'unknown' };
      }
      return { status: 'identified', animal };
    } catch (err) {
      console.error(err);
      return { status: 'unknown' };
    } finally {
      setIdentifying(false);
    }
  }, []);

  return { identifying, identify };
};
