import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import HolographicCard from '@/components/HolographicCard';
import RarityBadge from '@/components/RarityBadge';
import { normalizeRarity, type Rarity } from '@/data/mockData';

/** Comptes de test exclus (+test, +all, App Store review). */
const TEST_ACCOUNT_IDS = ['ac0df155-7422-4073-bfc1-14e2a71960bc', 'c62717cb-255a-4491-a5a0-132880e703be', 'f7910e92-39a6-4703-b31d-bf1e245e2a4e'];

interface Photo { id: string; image_url: string; author: string | null }

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
 */
const ExplorerPhotosStrip = ({ animalName, scientificName, rarity, excludeUserId, isPremium }: Props) => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [zoom, setZoom] = useState<Photo | null>(null);

  useEffect(() => {
    if (!excludeUserId) { setPhotos([]); return; }
    let alive = true;
    (async () => {
      let rows: { id: string; image_url: string; user_id: string }[] = [];
      if (isPremium) {
        // Premium : captures de tout le monde (sauf comptes test et soi-même).
        const excluded = [...TEST_ACCOUNT_IDS, excludeUserId];
        const { data } = await supabase.from('captures').select('id, image_url, user_id')
          .eq('animal_name', animalName).eq('status', 'approved')
          .not('user_id', 'in', `(${excluded.join(',')})`)
          .order('created_at', { ascending: false }).limit(12);
        rows = data ?? [];
      } else {
        // Gratuit : uniquement les explorateurs suivis.
        const { data: follows } = await supabase.from('explorer_follows').select('following_id')
          .eq('follower_id', excludeUserId).eq('status', 'accepted');
        const followedIds = (follows ?? []).map((f) => f.following_id).filter((id) => !TEST_ACCOUNT_IDS.includes(id));
        if (followedIds.length === 0) { if (alive) setPhotos([]); return; }
        const { data } = await supabase.from('captures').select('id, image_url, user_id')
          .eq('animal_name', animalName).eq('status', 'approved')
          .in('user_id', followedIds)
          .order('created_at', { ascending: false }).limit(12);
        rows = data ?? [];
      }
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('user_id, display_name, username').in('user_id', ids)
        : { data: [] as any[] };
      const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name || p.username]));
      if (alive) setPhotos(rows.map((r) => ({ id: r.id, image_url: r.image_url, author: byId.get(r.user_id) ?? null })));
    })();
    return () => { alive = false; };
  }, [animalName, excludeUserId, isPremium]);

  if (!photos || photos.length === 0) return null;

  return (
    <div>
      <p className="px-1 mb-2 text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{t('capture.explorerPhotos.title')}</p>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map((p) => (
          <button key={p.id} type="button" onClick={() => setZoom(p)} className="snap-start shrink-0 w-32 text-left active:scale-95 transition-transform">
            <img src={p.image_url} alt="" loading="lazy" className="w-32 h-32 rounded-2xl object-cover bg-muted" />
            {p.author && <p className="mt-1 px-1 text-[11px] text-muted-foreground truncate">{p.author}</p>}
          </button>
        ))}
      </div>
      {zoom && createPortal(
        <div
          className="detail-fullscreen fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-foreground"
          style={{ ['--photo-blur' as any]: '50px', ['--photo-scale' as any]: '2.25', ['--photo-veil' as any]: '0.38' } as React.CSSProperties}
          onClick={() => setZoom(null)}
        >
          <div aria-hidden className="detail-photo-backdrop" style={{ backgroundImage: `url("${zoom.image_url}")` }} />
          <div aria-hidden className="detail-photo-veil bg-foreground" />
          <div className="relative w-full h-full max-w-[min(100vw,100vh)] max-h-screen z-10 flex items-center justify-center p-4 pointer-events-none">
            <HolographicCard
              rarity={rarity}
              containInteraction
              className="holo-fullscreen-photo relative rounded-[1.5rem] pointer-events-auto touch-none"
              style={{ ['--holo-radius' as any]: '1.5rem' }}
              overlay={<div className="holo-fullscreen-rarity"><RarityBadge rarity={rarity} plain /></div>}
            >
              <div className={`relative w-full h-full rounded-[1.5rem] overflow-hidden shadow-2xl holo-frame holo-frame--fullscreen holo-frame--${normalizeRarity(rarity).replace(/_/g, '-')}`}>
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/30">
                  <img
                    src={zoom.image_url}
                    alt={animalName}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                  <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-5 pr-6 pt-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <h3 className="text-white font-display font-bold text-2xl leading-tight drop-shadow-lg">{animalName}</h3>
                    {scientificName && (
                      <p className="text-white/90 text-sm italic font-body leading-tight mt-1 drop-shadow">{scientificName}</p>
                    )}
                    {zoom.author && (
                      <p className="text-white/70 text-xs font-body leading-tight mt-1 drop-shadow">{zoom.author}</p>
                    )}
                  </div>
                </div>
              </div>
            </HolographicCard>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoom(null); }}
            className="absolute top-3 right-3 z-[60] w-16 h-16 -m-1 p-1 rounded-full flex items-center justify-center text-white/90 active:text-white transition-colors"
            style={{ touchAction: 'manipulation' }}
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
          >
            <span className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-2xl font-light leading-none pointer-events-none">✕</span>
          </button>
        </div>,
        (document.querySelector('[role="dialog"]') as HTMLElement) || document.body,
      )}
    </div>
  );
};

export default ExplorerPhotosStrip;
