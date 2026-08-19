import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dataUrlToBytes } from '@/lib/imageProcessing';
import type { AnimalResult, GeoTag } from '@/types/capture';
import { logDatasetEvent } from '@/lib/dataset';

interface SaveContext {
  userId: string | undefined;
  photo: string | null;
  geo: GeoTag;
}

/** Persistence layer for captures: storage upload, insert, duplicate replace, manual submission. */
export const useCaptureSave = ({ userId, photo, geo }: SaveContext) => {
  const [saving, setSaving] = useState(false);
  const [defaultShare, setDefaultShare] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('default_share_captures')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).default_share_captures === false) setDefaultShare(false);
      });
  }, [userId]);

  const uploadImage = useCallback(async () => {
    if (!photo || !userId) return null;
    const fileName = `${userId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('captures')
      .upload(fileName, dataUrlToBytes(photo), { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('captures').getPublicUrl(fileName);
    return urlData.publicUrl;
  }, [photo, userId]);

  const findDuplicate = useCallback(
    async (animalName: string) => {
      if (!userId) return null;
      const { data } = await supabase
        .from('captures')
        .select('id, image_url, animal_name')
        .eq('user_id', userId)
        .ilike('animal_name', animalName)
        .limit(1);
      return data && data.length > 0 ? data[0] : null;
    },
    [userId]
  );

  const insertCapture = useCallback(
    async (animal: AnimalResult) => {
      if (!photo || !userId) return null;
      setSaving(true);
      try {
        const imageUrl = await uploadImage();
        if (!imageUrl) return null;
        const { error } = await supabase.from('captures').insert({
          user_id: userId,
          image_url: imageUrl,
          animal_name: animal.animal_name,
          scientific_name: animal.scientific_name,
          category: animal.category,
          description: animal.description,
          habitat: animal.habitat,
          diet: animal.diet,
          conservation: animal.conservation,
          fun_fact: animal.fun_fact,
          rarity: animal.rarity,
          shared: defaultShare,
          caption: null,
          location: geo.name || null,
          latitude: geo.coords?.lat || null,
          longitude: geo.coords?.lng || null,
          subject_bbox: animal.subject_bbox ?? null,
        });
        if (error) throw error;
        // Dataset : l'explorateur a accepté la proposition de l'IA.
        void logDatasetEvent({
          event_type: 'user_accepted',
          source: 'client',
          image_url: imageUrl,
          predicted_name: animal.animal_name,
          predicted_scientific_name: animal.scientific_name ?? null,
          predicted_category: animal.category ?? null,
          predicted_rarity: animal.rarity ?? null,
          confidence: animal.confidence ?? null,
          subject_bbox: animal.subject_bbox ?? null,
          label_name: animal.animal_name,
          label_scientific_name: animal.scientific_name ?? null,
          label_category: animal.category ?? null,
          label_rarity: animal.rarity ?? null,
          location: geo.name || null,
          latitude: geo.coords?.lat ?? null,
          longitude: geo.coords?.lng ?? null,
        });
        return imageUrl;
      } finally {
        setSaving(false);
      }
    },
    [photo, userId, uploadImage, defaultShare, geo]
  );

  const replaceCapture = useCallback(
    async (animal: AnimalResult, captureId: string) => {
      if (!photo || !userId) return null;
      setSaving(true);
      try {
        const imageUrl = await uploadImage();
        if (!imageUrl) return null;
        const { error } = await supabase
          .from('captures')
          .update({
            image_url: imageUrl,
            scientific_name: animal.scientific_name,
            category: animal.category,
            description: animal.description,
            habitat: animal.habitat,
            diet: animal.diet,
            conservation: animal.conservation,
            fun_fact: animal.fun_fact,
            rarity: animal.rarity,
            shared: defaultShare,
            caption: null,
            location: geo.name || null,
            latitude: geo.coords?.lat || null,
            longitude: geo.coords?.lng || null,
            subject_bbox: animal.subject_bbox ?? null,
          })
          .eq('id', captureId);
        if (error) throw error;
        return imageUrl;
      } finally {
        setSaving(false);
      }
    },
    [photo, userId, uploadImage, defaultShare, geo]
  );

  const submitManualEntry = useCallback(
    async (entry: { name: string; species: string; description: string }) => {
      if (!photo || !userId) return false;
      setSaving(true);
      try {
        const imageUrl = await uploadImage();
        if (!imageUrl) return false;
        const { data: inserted, error } = await supabase
          .from('captures')
          .insert({
            user_id: userId,
            image_url: imageUrl,
            animal_name: entry.name,
            scientific_name: entry.species || null,
            category: null,
            description: entry.description,
            habitat: null,
            diet: null,
            conservation: null,
            fun_fact: null,
            rarity: 'common',
            shared: defaultShare,
            caption: null,
            location: geo.name || null,
            latitude: geo.coords?.lat || null,
            longitude: geo.coords?.lng || null,
            status: 'pending_review',
          })
          .select('id')
          .single();
        if (error) throw error;
        // Dataset : saisie manuelle de l'explorateur (correction ou contestation
        // de l'IA). Le label n'est PAS une vérité terrain avant modération.
        void logDatasetEvent({
          event_type: 'user_correction',
          source: 'client',
          capture_id: inserted?.id ?? null,
          image_url: imageUrl,
          label_name: entry.name,
          label_scientific_name: entry.species || null,
          user_description: entry.description || null,
          location: geo.name || null,
          latitude: geo.coords?.lat ?? null,
          longitude: geo.coords?.lng ?? null,
        });
        // Pré-modération automatique : si l'IA confirme le nom sans ambiguïté,
        // la capture est validée immédiatement, sinon elle reste en modération.
        if (inserted?.id) {
          supabase.functions
            .invoke('auto-moderate-capture', { body: { capture_id: inserted.id } })
            .then(({ error: autoError }) => {
              if (autoError) console.error('auto-moderate-capture failed', autoError);
            });
        }
        return true;

      } finally {
        setSaving(false);
      }
    },
    [photo, userId, uploadImage, defaultShare, geo]
  );

  return { saving, defaultShare, findDuplicate, insertCapture, replaceCapture, submitManualEntry };
};
