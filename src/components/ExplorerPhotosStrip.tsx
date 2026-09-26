import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Crown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Comptes de test exclus (+test, +all, App Store review). */
const TEST_ACCOUNT_IDS = ['ac0df155-7422-4073-bfc1-14e2a71960bc', 'c62717cb-255a-4491-a5a0-132880e703be', 'f7910e92-39a6-4703-b31d-bf1e245e2a4e'];

interface Photo { id: string; image_url: string; author: string | null }

interface Props {
  animalName: string;
  excludeUserId?: string;
  isPremium: boolean;
  onGoPremium: () => void;
}

/** Photos de la même espèce prises par d'autres explorateurs (Premium). */
const ExplorerPhotosStrip = ({ animalName, excludeUserId, isPremium, onGoPremium }: Props) => {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    if (!isPremium) return;
    let alive = true;
    (async () => {
      const excluded = [...TEST_ACCOUNT_IDS, ...(excludeUserId ? [excludeUserId] : [])];
      const { data } = await supabase.from('captures').select('id, image_url, user_id')
        .eq('animal_name', animalName).eq('status', 'approved')
        .not('user_id', 'in', `(${excluded.join(',')})`)
        .order('created_at', { ascending: false }).limit(12);
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('user_id, display_name, username').in('user_id', ids)
        : { data: [] as any[] };
      const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name || p.username]));
      if (alive) setPhotos(rows.map((r) => ({ id: r.id, image_url: r.image_url, author: byId.get(r.user_id) ?? null })));
    })();
    return () => { alive = false; };
  }, [animalName, excludeUserId, isPremium]);

  if (!isPremium) {
    return (
      <button type="button" onClick={onGoPremium} className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left active:opacity-70">
        <Crown className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-display font-semibold text-foreground">{t('capture.explorerPhotos.lockedTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('capture.explorerPhotos.lockedDesc')}</p>
        </div>
      </button>
    );
  }

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
