/** Staff-only, bounded preview runner. Never writes a capture or a profile.
 * Set FAUNEX_PUBLIC_API_URL, FAUNEX_PUBLIC_KEY, FAUNEX_STAFF_TOKEN in the
 * process environment. Never put the staff token in a file or CLI arguments.
 * Run: bun scripts/catalogue/review-generic-captures.ts Fourmi 5
 * Every preview uses AI; keep the limit small and review before proceeding.
 */
import { createClient } from '@supabase/supabase-js';
import { isReclassificationGroupLabel } from '../../supabase/functions/_shared/generic-capture-groups';

const groups = ['Fourmi', 'Fourmi ailée', 'Araignée', 'Araignée commune', 'Mouche', 'Mouche commune'];
const group = process.argv[2] ?? 'Fourmi';
const limit = Number(process.argv[3] ?? '5');
if (!groups.includes(group) || !Number.isInteger(limit) || limit < 1 || limit > 10) {
  throw new Error('Choisir un groupe de la première vague et un lot de 1 à 10 photos.');
}
const url = process.env.FAUNEX_PUBLIC_API_URL;
const key = process.env.FAUNEX_PUBLIC_KEY;
const token = process.env.FAUNEX_STAFF_TOKEN;
if (!url || !key || !token) throw new Error('Session équipe et configuration publique requises dans les variables de processus.');
const client = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } },
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: identity, error: authError } = await client.auth.getUser(token);
if (authError || !identity.user) throw new Error('Session expirée ou invalide.');
const { data: staff, error: staffError } = await client.rpc('is_staff', { _user_id: identity.user.id });
if (staffError || staff !== true) throw new Error('Accès réservé à l’équipe.');
const { data: photos, error } = await client.from('captures').select('id')
  .eq('animal_name', group).eq('status', 'approved').order('created_at', { ascending: false }).limit(limit);
if (error) throw new Error('Lecture des photos impossible.');

// Sequential small lots avoid saturating the moderation service. Preview only:
// confidence alone never authorizes reclassification or proves an identity.
for (const photo of photos ?? []) {
  const { data, error: previewError } = await client.functions.invoke('enrich-capture', { body: {
    capture_id: photo.id, apply: false, force_name: false, quality: 'standard',
    moderator_notes: "Reclassement d'une ancienne fiche de groupe : vérifier les caractères diagnostiques sur cette photo. Ne jamais choisir l'espèce la plus commune par défaut ni supposer que la photo vient de France. Si les caractères ne permettent pas de distinguer l'espèce, rester indéterminé.",
  } });
  const animal = data?.success && data?.preview === true ? data.animal : null;
  const precise = animal && !isReclassificationGroupLabel(animal.animal_name, animal.scientific_name)
    && /^[A-Z][a-z]+ [a-z]+$/.test(String(animal.scientific_name ?? ''))
    && !/\s(spp?|cf|aff)$/.test(String(animal.scientific_name));
  console.log(JSON.stringify({ captureId: photo.id,
    status: previewError ? 'preview_unavailable' : precise ? 'needs_visual_confirmation' : 'unresolved',
    proposal: precise ? { name: animal.animal_name, scientific: animal.scientific_name } : null,
  }));
}