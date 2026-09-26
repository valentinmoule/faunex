import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import CardDetailSheet from '@/components/CardDetailSheet';
import { type Rarity } from '@/data/mockData';

/** Comptes de test exclus (+test, +all, App Store review). */
const TEST_ACCOUNT_IDS = ['ac0df155-7422-4073-bfc1-14e2a71960bc', 'c62717cb-255a-4491-a5a0-132880e703be', 'f7910e92-39a6-4703-b31d-bf1e245e2a4e'];

/** Nombre max de photos affichées dans la rangée (les plus récentes). */
const MAX_PHOTOS = 30;

interface Photo {
  id: string;
  image_url: string;
  user_id: string;
  author: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Props {
  animalName: string;
  scientificName?: string | null;
  rarity: Rarity;
  excludeUserId?: string;
  isPremium: boolean;
}

/**
 * Photos de la même espèce prises par d'autres explorateurs.
 * Gratuit : uniquement les explorateurs suivis. Premium : tout le monde.
 * Un clic ouvre la même modale que le feed (fiche allégée, auteur inclus).
 */
const ExplorerPhotosStrip = ({ animalName, scientificName, rarity, excludeUserId, isPremium }: Props) => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);

  useEffect(() => {
    if (!excludeUserId) { setPhotos([]); return; }
    let alive = true;
    (async () => {
      let rows: { id: string; image_url: string; user_id: string; created_at: string }[] = [];
      if (isPremium) {
        // Premium : captures de tout le monde (sauf comptes test et soi-même).
        const excluded = [...TEST_ACCOUNT_IDS, excludeUserId];
        const { data } = await supabase.from('captures').select('id, image_url, user_id, created_at')
          .eq('animal_name', animalName).eq('status', 'approved')
          .not('user_id', 'in', `(${excluded.join(',')})`)
          .order('created_at', { ascending: false }).limit(MAX_PHOTOS);
        rows = data ?? [];
      } else {
        // Gratuit : uniquement les explorateurs suivis.
        const { data: follows } = await supabase.from('explorer_follows').select('following_id')
          .eq('follower_id', excludeUserId).eq('status', 'accepted');
        const followedIds = (follows ?? []).map((f) => f.following_id).filter((id) => !TEST_ACCOUNT_IDS.includes(id));
        if (followedIds.length === 0) { if (alive) setPhotos([]); return; }
        const { data } = await supabase.from('captures').select('id, image_url, user_id, created_at')
          .eq('animal_name', animalName).eq('status', 'approved')
          .in('user_id', followedIds)
          .order('created_at', { ascending: false }).limit(MAX_PHOTOS);
        rows = data ?? [];
      }
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', ids)
        : { data: [] as any[] };
      const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      if (alive) setPhotos(rows.map((r) => ({
        id: r.id,
        image_url: r.image_url,
        user_id: r.user_id,
        created_at: r.created_at,
        author: byId.get(r.user_id)?.display_name || byId.get(r.user_id)?.username || null,
        avatar_url: byId.get(r.user_id)?.avatar_url ?? null,
      })));
    })();
    return () => { alive = false; };
  }, [animalName, excludeUserId, isPremium]);

  if (!photos || photos.length === 0) return null;

  return (
    <div>
      <p className="px-1 mb-2 text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{t('capture.explorerPhotos.title')}</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map((p) => (
          <button key={p.id} type="button" onClick={() => setSelected(p)} className="snap-start shrink-0 w-32 text-left active:scale-95 transition-transform">
            <img src={p.image_url} alt="" loading="lazy" className="w-32 h-32 rounded-2xl object-cover bg-muted" />
            {p.author && <p className="mt-1 px-1 text-[11px] text-muted-foreground truncate">{p.author}</p>}
          </button>
        ))}
      </div>
      {selected && (
        <CardDetailSheet
          open
          onClose={() => setSelected(null)}
          feedView
          author={{ id: selected.user_id, name: selected.author || t('social.common.anonymous'), avatarUrl: selected.avatar_url }}
          card={{
            id: selected.id,
            name: animalName,
            scientificName: scientificName || '',
            image: selected.image_url,
            rarity,
            category: '',
            description: '',
            habitat: '',
            diet: '',
            conservation: '',
            funFact: '',
            discoveredAt: selected.created_at,
            location: '',
          }}
        />
      )}
    </div>
  );
};

export default ExplorerPhotosStrip;
