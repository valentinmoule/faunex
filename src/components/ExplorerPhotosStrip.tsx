import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Comptes de test exclus (+test, +all, App Store review). */
const TEST_ACCOUNT_IDS = ['ac0df155-7422-4073-bfc1-14e2a71960bc', 'c62717cb-255a-4491-a5a0-132880e703be', 'f7910e92-39a6-4703-b31d-bf1e245e2a4e'];

interface Photo { id: string; image_url: string; author: string | null }

interface Props {
  animalName: string;
  excludeUserId?: string;
  isPremium: boolean;
}

/**
 * Photos de la même espèce prises par d'autres explorateurs.
 * Gratuit : uniquement les explorateurs suivis. Premium : tout le monde.
 */
const ExplorerPhotosStrip = ({ animalName, excludeUserId, isPremium }: Props) => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

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
      <div className="-mx-5 px-5 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map((p) => (
          <button key={p.id} type="button" onClick={() => setZoom(p.image_url)} className="snap-start shrink-0 w-32 text-left active:scale-95 transition-transform">
            <img src={p.image_url} alt="" loading="lazy" className="w-32 h-32 rounded-2xl object-cover bg-muted" />
            {p.author && <p className="mt-1 px-1 text-[11px] text-muted-foreground truncate">{p.author}</p>}
          </button>
        ))}
      </div>
      {zoom && createPortal(
        <div className="fixed inset-0 z-[10000] bg-foreground/95 flex items-center justify-center" onClick={() => setZoom(null)}>
          <button type="button" aria-label={t('common.close', { defaultValue: 'Fermer' })} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 w-10 h-10 rounded-full bg-background/15 text-background flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          <img src={zoom} alt="" className="max-w-full max-h-full object-contain" />
        </div>,
        (document.querySelector('[role="dialog"]') as HTMLElement) || document.body,
      )}
    </div>
  );
};

export default ExplorerPhotosStrip;
