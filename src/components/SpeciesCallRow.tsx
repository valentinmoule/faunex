import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Lock, Pause, Play, Volume2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { callLabelKey, fetchSpeciesCall, type SpeciesCall } from '@/lib/speciesCall';

// Visible to everyone; playback is Premium-only, others get an upsell modal.
export default function SpeciesCallRow({ scientificName, category, isPremium }: { scientificName?: string; category?: string; isPremium: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [call, setCall] = useState<SpeciesCall | null>(null);
  const [playing, setPlaying] = useState(false);
  const [upsell, setUpsell] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const labelKey = callLabelKey(category);

  useEffect(() => {
    setCall(null);
    if (!scientificName) return;
    let alive = true;
    fetchSpeciesCall(scientificName).then((c) => alive && setCall(c));
    return () => { alive = false; audio.current?.pause(); audio.current = null; setPlaying(false); };
  }, [scientificName]);

  if (!call) return null;

  const toggle = () => {
    if (!isPremium) { setUpsell(true); return; }
    if (!audio.current) {
      audio.current = new Audio(call.url);
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) { audio.current.pause(); setPlaying(false); }
    else { audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  return (
    <>
      <button type="button" onClick={toggle} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
        <span className="text-muted-foreground"><Volume2 className="h-4 w-4" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-foreground/85">{t(`species.call.${labelKey}`)}</span>
          {isPremium && call.attribution && <span className="block truncate text-[11px] text-muted-foreground">{call.attribution}</span>}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {!isPremium ? <Lock className="h-3.5 w-3.5" /> : playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
        </span>
      </button>
      <Dialog open={upsell} onOpenChange={setUpsell}>
        <DialogContent className="z-[1410] max-w-sm rounded-3xl" overlayClassName="z-[1400]">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber/20">
            <Sparkles className="h-7 w-7 text-amber" />
          </div>
          <h2 className="text-center font-display text-lg font-bold text-foreground">{t('species.call.premiumTitle')}</h2>
          <p className="text-center text-sm leading-relaxed text-muted-foreground">{t('species.call.premiumBody')}</p>
          <button onClick={() => { setUpsell(false); navigate('/premium'); }} className="mt-2 w-full rounded-full bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground">
            {t('species.call.premiumCta')}
          </button>
          <button onClick={() => setUpsell(false)} className="w-full rounded-full px-4 py-2 font-display text-sm font-semibold text-muted-foreground">
            {t('species.call.later')}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
