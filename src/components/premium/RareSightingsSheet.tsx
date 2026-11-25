import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, MapPin } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RarityBadge } from '@/components/RarityBadge';
import { categoryLineIcon } from '@/components/icons/CategoryIcons';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';

export interface RareSighting {
  animal_name: string; scientific_name: string | null; category: string | null; rarity: string;
  lat: number; lng: number; distance_km: number; seen_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isPremium: boolean;
  position: [number, number] | null;
  onShow?: (s: RareSighting) => void;
}

export default function RareSightingsSheet({ open, onOpenChange, isPremium, position, onShow }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { speciesName } = useSpeciesName();
  const [items, setItems] = useState<RareSighting[] | null>(null);

  useEffect(() => {
    if (!open || !isPremium || !position) return;
    let alive = true;
    setItems(null);
    supabase.rpc('rare_sightings_near', { p_lat: position[0], p_lng: position[1], p_radius_km: 10 }).then(({ data }) => {
      if (alive) setItems(((data ?? []) as RareSighting[]).sort((a, b) => a.distance_km - b.distance_km));
    });
    return () => { alive = false; };
  }, [open, isPremium, position]);

  const ago = (iso: string) => {
    const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return mins < 60 ? t('premiumFeatures.radar.minutesAgo', { m: mins }) : t('premiumFeatures.radar.hoursAgo', { h: Math.round(mins / 60) });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <SheetTitle className="font-display text-xl font-bold">{t('premiumFeatures.radar.title')}</SheetTitle>
        {!isPremium ? (
          <div className="mt-4 space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber/15 text-amber"><Crown className="h-7 w-7" /></span>
            <p className="font-display text-lg font-bold text-foreground">{t('premiumFeatures.radar.lockedTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('premiumFeatures.radar.lockedBody')}</p>
            <Button onClick={() => navigate('/premium')} className="game-button h-12 w-full font-display">{t('premiumFeatures.radar.cta')}</Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{t('premiumFeatures.radar.subtitle')}</p>
            {!position ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('premiumFeatures.radar.noLocation')}</p>
            ) : items === null ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('premiumFeatures.radar.empty')}</p>
            ) : (
              <div className="mt-2 divide-y divide-border/60">
                {items.map((s) => {
                  const Icon = categoryLineIcon(s.category ?? '');
                  return (
                    <button key={s.animal_name} type="button" onClick={() => onShow?.(s)} className="flex w-full items-center gap-3 py-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-5 w-5" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-bold text-foreground">{speciesName(s.animal_name)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{t('premiumFeatures.radar.distance', { km: s.distance_km })} · {ago(s.seen_at)}</span>
                      </span>
                      <RarityBadge rarity={s.rarity} plain />
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
