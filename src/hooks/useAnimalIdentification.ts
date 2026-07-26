import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressForAI } from '@/lib/imageProcessing';
import type { AnimalResult } from '@/types/capture';

type IdentifyOutcome =
  | { status: 'identified'; animal: AnimalResult }
  | { status: 'unknown' };

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
