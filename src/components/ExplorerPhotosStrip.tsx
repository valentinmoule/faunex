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
 * Gratuit : aperçu flouté. Premium : photos de tous les explorateurs.
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
      let rows: { id: string; image_url: string; user_id: string; created_at: string }[] = [];
      // Les comptes gratuits reçoivent seulement quelques aperçus, toujours floutés.
      const excluded = [...TEST_ACCOUNT_IDS, excludeUserId];
      const { data } = await supabase.from('captures').select('id, image_url, user_id, created_at')
        .eq('animal_name', animalName).eq('status', 'approved')
        .not('user_id', 'in', `(${excluded.join(',')})`)
        .order('created_at', { ascending: false }).limit(isPremium ? MAX_PHOTOS : 6);
      rows = data ?? [];
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
      <div className={`relative ${isPremium ? '' : 'overflow-hidden rounded-2xl'}`}>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map((p) => (
          isPremium ? (
            <button key={p.id} type="button" onClick={() => setSelected(p)} className="snap-start shrink-0 w-32 text-left active:scale-95 transition-transform">
              <img src={p.image_url} alt="" loading="lazy" className="w-32 h-32 rounded-2xl object-cover bg-muted" />
              {p.author && <p className="mt-1 px-1 text-[11px] text-muted-foreground truncate">{p.author}</p>}
            </button>
          ) : (
            <div key={p.id} aria-hidden="true" className="snap-start shrink-0 w-32">
              <img src={p.image_url} alt="" loading="lazy" className="w-32 h-32 rounded-2xl object-cover bg-muted blur-[4px] scale-[1.03]" />
            </div>
          )
        ))}
      </div>
      {!isPremium && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
          <div className="flex max-w-[290px] flex-col items-center gap-1.5 rounded-2xl bg-background/90 px-4 py-3 shadow-sm backdrop-blur-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm"><Lock className="h-4 w-4 text-primary" /></span>
            <p className="text-sm font-display font-bold text-foreground">{t('capture.explorerPhotos.lockedTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('capture.explorerPhotos.lockedDesc')}</p>
            <Button type="button" size="sm" onClick={() => navigate('/premium')} className="mt-1 gap-1.5">
              <Crown className="h-4 w-4" />
              {t('capture.explorerPhotos.premiumCta')}
            </Button>
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
