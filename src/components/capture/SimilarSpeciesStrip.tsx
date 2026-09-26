import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface SimilarSpecies {
  name: string;
  scientific_name: string | null;
  rarity: string | null;
  image: string | null;
  /** true si la photo vient d'un autre explorateur Faunex. */
  fromExplorer: boolean;
}

const cache = new Map<string, SimilarSpecies>();

async function loadSpecies(name: string): Promise<SimilarSpecies> {
  const key = name.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const [{ data: animal }, { data: cap }] = await Promise.all([
    supabase.from('animals').select('name, scientific_name, rarity').ilike('name', name.trim()).limit(1).maybeSingle(),
    supabase.from('captures').select('image_url').ilike('animal_name', name.trim()).eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  let image: string | null = cap?.image_url ?? null;
  const fromExplorer = Boolean(image);
  if (!image) {
    try {
      const q = animal?.scientific_name || name;
      const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=1&locale=fr`);
      const json = await res.json();
      image = json?.results?.[0]?.default_photo?.medium_url ?? null;
    } catch { /* pas de photo */ }
  }
  const out: SimilarSpecies = {
    name: animal?.name ?? name.trim(),
    scientific_name: animal?.scientific_name ?? null,
    rarity: animal?.rarity ?? null,
    image,
    fromExplorer,
  };
  cache.set(key, out);
  return out;
}

interface Props {
  names: string[];
  isPremium: boolean;
  onPick: (s: SimilarSpecies) => void;
  onGoPremium: () => void;
}

/** Suggestions d'espèces semblables avec photo, défilement horizontal (Premium). */
const SimilarSpeciesStrip = ({ names, isPremium, onPick, onGoPremium }: Props) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<SimilarSpecies[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!isPremium || names.length === 0) return;
    let alive = true;
    Promise.all(names.slice(0, 6).map(loadSpecies)).then((r) => { if (alive) setItems(r); });
    return () => { alive = false; };
  }, [isPremium, names.join('|')]);

  if (names.length === 0) return null;

  if (!isPremium) {
    return (
      <button type="button" onClick={onGoPremium} className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left active:opacity-70">
        <Crown className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-display font-semibold text-foreground">{t('capture.similar.lockedTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('capture.similar.lockedDesc')}</p>
        </div>
      </button>
    );
  }

  return (
    <div>
      <p className="px-1 mb-2 text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{t('capture.similar.title')}</p>
      <div className="-mx-5 px-5 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1" style={{ scrollbarWidth: 'none' }}>
        {(items ?? names.slice(0, 6).map((n) => null as SimilarSpecies | null)).map((s, i) => (
          <button
            key={s?.name ?? i}
            type="button"
            disabled={!s}
            onClick={() => { if (s) { setPicked(s.name); onPick(s); } }}
            className={`snap-start shrink-0 w-32 text-left rounded-2xl overflow-hidden bg-card border ${picked === s?.name ? 'border-primary ring-2 ring-primary/40' : 'border-border'} active:scale-95 transition-transform`}
          >
            <div className="relative w-full aspect-square bg-muted">
              {s?.image ? <img src={s.image} alt={s.name} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse bg-muted" />}
              {picked === s?.name && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Check className="w-3 h-3" /></span>
              )}
            </div>
            <div className="px-2.5 py-2">
              <p className="text-xs font-display font-semibold text-foreground leading-tight line-clamp-2">{s?.name ?? names[i]}</p>
              {s && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.fromExplorer ? t('capture.similar.byExplorer') : s.scientific_name ?? ''}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimilarSpeciesStrip;
