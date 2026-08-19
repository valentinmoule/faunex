import { supabase } from '@/integrations/supabase/client';

/**
 * Constitution progressive du dataset Faunex.
 *
 * Chaque étape du parcours d'identification écrit un événement dans
 * `ml_dataset_events`, avec une séparation stricte :
 *  - `ai_prediction`    : ce que le modèle a proposé (jamais une vérité terrain)
 *  - `user_accepted`    : l'explorateur a validé la proposition IA
 *  - `user_correction`  : l'explorateur a fourni un nom différent
 *  - `user_dispute`     : l'explorateur conteste / envoie en modération
 *  - `moderation_*`     : décision humaine ou automatique (vérité terrain)
 *
 * L'écriture est « best effort » : elle ne doit jamais bloquer ni casser
 * le flux d'identification existant.
 */
export type DatasetEventType =
  | 'ai_prediction'
  | 'user_accepted'
  | 'user_correction'
  | 'user_dispute';

export interface DatasetEventInput {
  event_type: DatasetEventType;
  source: 'client';
  capture_id?: string | null;
  model?: string | null;
  image_url?: string | null;
  image_hash?: string | null;
  predicted_name?: string | null;
  predicted_scientific_name?: string | null;
  predicted_category?: string | null;
  predicted_rarity?: string | null;
  confidence?: number | null;
  alternatives?: unknown;
  subject_bbox?: unknown;
  label_name?: string | null;
  label_scientific_name?: string | null;
  label_category?: string | null;
  label_rarity?: string | null;
  user_description?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  payload?: unknown;
}

/** Hash de la dernière image analysée : clé de jointure entre prédiction et label. */
let pendingImageHash: string | null = null;

export const setPendingImageHash = (hash: string | null) => {
  pendingImageHash = hash;
};

export const getPendingImageHash = () => pendingImageHash;

export const logDatasetEvent = async (input: DatasetEventInput): Promise<void> => {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from('ml_dataset_events').insert({
      ...input,
      user_id: userId,
      image_hash: input.image_hash ?? pendingImageHash,
      // La vérité terrain n'est jamais décidée côté client.
      is_ground_truth: false,
    } as never);
    if (error) console.warn('dataset event skipped', error.message);
  } catch (err) {
    console.warn('dataset event failed', err);
  }
};
