import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CardDetailSheet from '@/components/CardDetailSheet';
import { Button } from '@/components/ui/button';
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
  locked: boolean;
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
 * Gratuit : photos nettes des comptes suivis, aperçu flouté des autres.
 * Premium : photos de tous les explorateurs.
 * Un clic ouvre la même modale que le feed (fiche allégée, auteur inclus).
 */
const ExplorerPhotosStrip = ({ animalName, scientificName, rarity, excludeUserId, isPremium }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);

  useEffect(() => {
    if (!excludeUserId) { setPhotos([]); return; }
    let alive = true;
    (async () => {
      const excluded = [...TEST_ACCOUNT_IDS, excludeUserId];
      type CaptureRow = { id: string; image_url: string; user_id: string; created_at: string };
      let rows: Array<CaptureRow & { locked: boolean }> = [];

      if (isPremium) {
        const { data } = await supabase.from('captures').select('id, image_url, user_id, created_at')
          .eq('animal_name', animalName).eq('status', 'approved').eq('shared', true)
          .not('user_id', 'in', `(${excluded.join(',')})`)
          .order('created_at', { ascending: false }).limit(MAX_PHOTOS);
        rows = (data ?? []).map((row) => ({ ...row, locked: false }));
      } else {
        const { data: follows } = await supabase.from('explorer_follows').select('following_id')
          .eq('follower_id', excludeUserId).eq('status', 'accepted');
        const followedIds = (follows ?? []).map((follow) => follow.following_id)
          .filter((id) => !TEST_ACCOUNT_IDS.includes(id));

        const followedRequest = followedIds.length
          ? supabase.from('captures').select('id, image_url, user_id, created_at')
            .eq('animal_name', animalName).eq('status', 'approved').eq('shared', true)
            .in('user_id', followedIds).order('created_at', { ascending: false }).limit(MAX_PHOTOS)
          : Promise.resolve({ data: [] as CaptureRow[] });
        let othersRequest = supabase.from('captures').select('id, image_url, user_id, created_at')
          .eq('animal_name', animalName).eq('status', 'approved').eq('shared', true)
          .not('user_id', 'in', `(${excluded.join(',')})`);
        if (followedIds.length) othersRequest = othersRequest.not('user_id', 'in', `(${followedIds.join(',')})`);
        const [{ data: followed }, { data: others }] = await Promise.all([
          followedRequest,
          othersRequest.order('created_at', { ascending: false }).limit(3),
        ]);
        rows = [
          ...(followed ?? []).map((row) => ({ ...row, locked: false })),
          ...(others ?? []).map((row) => ({ ...row, locked: true })),
        ];
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
        locked: r.locked,
        author: byId.get(r.user_id)?.display_name || byId.get(r.user_id)?.username || null,
        avatar_url: byId.get(r.user_id)?.avatar_url ?? null,
      })));
    })();
    return () => { alive = false; };
  }, [animalName, excludeUserId, isPremium]);

  if (!photos || photos.length === 0) return null;

  const visiblePhotos = photos.filter((photo) => !photo.locked);
  const lockedPhotos = photos.filter((photo) => photo.locked);

  return (
    <div>
      <p className="px-1 mb-2 text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{t('capture.explorerPhotos.title')}</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none' }}>
        {visiblePhotos.map((p) => (
          <button key={p.id} type="button" onClick={() => setSelected(p)} className="snap-start shrink-0 w-32 text-left active:scale-95 transition-transform">
            <img src={p.image_url} alt="" loading="lazy" className="w-32 h-32 rounded-2xl object-cover bg-muted" />
            {p.author && <p className="mt-1 px-1 text-[11px] text-muted-foreground truncate">{p.author}</p>}
          </button>
        ))}
        {lockedPhotos.length > 0 && (
          <div className="relative h-40 w-[min(82vw,22rem)] shrink-0 snap-start overflow-hidden rounded-2xl">
            <div className="grid h-full grid-cols-3 gap-2">
              {lockedPhotos.map((p) => (
                <img key={p.id} src={p.image_url} alt="" loading="lazy" aria-hidden="true" className="h-full w-full scale-[1.04] object-cover blur-[4px]" />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/10 px-3 text-center">
              <div className="flex max-w-[260px] flex-col items-center gap-1.5 rounded-2xl bg-background/85 px-4 py-2.5 shadow-sm backdrop-blur-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-sm"><Lock className="h-3.5 w-3.5 text-primary" /></span>
                <p className="text-xs font-display font-bold text-foreground">{t('capture.explorerPhotos.lockedTitle')}</p>
                <Button type="button" size="sm" onClick={() => navigate('/premium')} className="h-8 gap-1.5">
                  <Crown className="h-3.5 w-3.5" />
                  {t('capture.explorerPhotos.premiumCta')}
                </Button>
              </div>
            </div>
          </div>
        )}
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
