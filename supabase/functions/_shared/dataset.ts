/**
 * Écriture serveur du dataset Faunex (table `ml_dataset_events`).
 *
 * Utilisé par les fonctions de modération : elles seules peuvent marquer un
 * événement comme vérité terrain (`is_ground_truth`), c'est-à-dire un couple
 * (image, label) validé par un humain ou par la pré-modération automatique
 * à haute confiance.
 *
 * L'appel est « best effort » : une erreur d'écriture ne doit jamais faire
 * échouer une décision de modération.
 */
export type ServerDatasetEventType =
  | 'auto_moderation_approved'
  | 'auto_moderation_deferred'
  | 'moderation_approved'
  | 'moderation_rejected'

export interface ServerDatasetEvent {
  event_type: ServerDatasetEventType
  source: string
  capture_id?: string | null
  user_id?: string | null
  model?: string | null
  image_url?: string | null
  predicted_name?: string | null
  predicted_scientific_name?: string | null
  predicted_category?: string | null
  predicted_rarity?: string | null
  confidence?: number | null
  subject_bbox?: unknown
  label_name?: string | null
  label_scientific_name?: string | null
  label_category?: string | null
  label_rarity?: string | null
  user_description?: string | null
  location?: string | null
  moderator_id?: string | null
  decision_reason?: string | null
  forced_name?: boolean
  is_ground_truth?: boolean
  payload?: unknown
}

export async function logDatasetEvent(supabase: any, event: ServerDatasetEvent) {
  try {
    // Le dataset consolidé n'accepte qu'une seule identification confirmée par
    // capture (un trigger l'écrit aussi dès qu'une capture passe en 'approved').
    if (event.is_ground_truth && event.capture_id) {
      const { data: existing } = await supabase
        .from('ml_dataset_events')
        .select('id')
        .eq('capture_id', event.capture_id)
        .eq('is_ground_truth', true)
        .maybeSingle()
      if (existing) return
    }
    const { error } = await supabase.from('ml_dataset_events').insert(event)
    if (error) console.error('dataset event insert failed', error.message)
  } catch (err) {
    console.error('dataset event failed', err)
  }
}
