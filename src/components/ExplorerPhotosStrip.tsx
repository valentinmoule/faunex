import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CardDetailSheet from '@/components/CardDetailSheet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [premiumOpen, setPremiumOpen] = useState(false);

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
          lockedPhotos.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="ghost"
              onClick={() => setPremiumOpen(true)}
              className="h-auto w-32 shrink-0 snap-start flex-col items-stretch justify-start overflow-hidden rounded-2xl p-0 text-left active:scale-95"
            >
              <span className="relative block h-32 w-32 overflow-hidden rounded-2xl bg-muted">
                <img src={p.image_url} alt="" loading="lazy" aria-hidden="true" className="h-full w-full scale-[1.35] object-cover blur-[5px]" />
                <span className="absolute inset-0 flex items-center justify-center bg-background/10">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur-sm">
                    <Lock className="h-4 w-4 text-primary" />
                  </span>
                </span>
              </span>
              <span className="mt-1 block max-w-full truncate px-1 text-[11px] font-normal text-muted-foreground blur-[3px] select-none">
                {p.author || t('social.common.anonymous')}
              </span>
            </Button>
          ))
        )}
      </div>
      <Dialog open={premiumOpen} onOpenChange={setPremiumOpen}>
        <DialogContent overlayClassName="z-[10000]" className="z-[10001] w-[calc(100%-2rem)] max-w-sm rounded-3xl border-0 px-6 pb-6 pt-8 text-center">
          <DialogHeader className="items-center text-center">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </span>
            <DialogTitle className="font-display text-xl">{t('capture.explorerPhotos.unlockTitle')}</DialogTitle>
            <DialogDescription className="pt-1 leading-relaxed">{t('capture.explorerPhotos.unlockDesc')}</DialogDescription>
          </DialogHeader>
          <Button type="button" onClick={() => navigate('/premium')} className="mt-2 w-full gap-2">
            <Crown className="h-4 w-4" />
            {t('capture.explorerPhotos.premiumCta')}
          </Button>
        </DialogContent>
      </Dialog>
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
