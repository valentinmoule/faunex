import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Sparkles, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { rarityDot } from '@/lib/bestiary';
import {
  useSpecializedCollections,
  type CollectionProgress,
  type CollectionTaxon,
} from '@/hooks/useSpecializedCollections';

interface Props {
  userId: string | undefined;
  isPremium: boolean;
}

/** Premium specialized collections (dog breeds, butterflies…) driven entirely by the database. */
const SpecializedCollections = ({ userId, isPremium }: Props) => {
  const navigate = useNavigate();
  const { collections, loading, loadCollectionTaxa } = useSpecializedCollections(userId);
  const [openCollection, setOpenCollection] = useState<CollectionProgress | null>(null);
  const [taxa, setTaxa] = useState<CollectionTaxon[] | null>(null);

  const specialized = collections.filter((c) => c.kind === 'specialized');

  useEffect(() => {
    if (!openCollection) {
      setTaxa(null);
      return;
    }
    let cancelled = false;
    loadCollectionTaxa(openCollection.collection_id).then((rows) => {
      if (!cancelled) setTaxa(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [openCollection, loadCollectionTaxa]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">
          Collections spécialisées
        </h2>
        <span className="text-[11px] font-display text-muted-foreground tabular-nums">
          {specialized.length} collection{specialized.length > 1 ? 's' : ''}
        </span>
      </div>

      {!isPremium && (
        <button
          onClick={() => navigate('/premium')}
          className="w-full mb-3 flex items-center gap-3 p-3 rounded-2xl border border-primary/30 bg-primary/5 text-left active:scale-[0.98] transition"
        >
          <span className="shrink-0 w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </span>
          <span className="flex-1">
            <span className="block text-xs font-display font-bold text-foreground">
              Débloque les collections spécialisées
            </span>
            <span className="block text-[11px] font-display text-muted-foreground">
              Races de chiens, papillons, rapaces… avec Faunex Premium.
            </span>
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {specialized.map((c) => {
          const pct = c.total > 0 ? Math.round((c.owned / c.total) * 100) : 0;
          return (
            <button
              key={c.collection_id}
              onClick={() => (isPremium ? setOpenCollection(c) : navigate('/premium'))}
              className="relative text-left p-3 rounded-2xl border border-border bg-card active:scale-[0.97] transition-all overflow-hidden"
            >
              <div className={isPremium ? '' : 'blur-[2px] opacity-60 select-none'}>
                <p className="text-xl mb-1">{c.icon || '✨'}</p>
                <p className="text-xs font-display font-bold text-foreground leading-tight">{c.title}</p>
                <p className="text-[10px] font-display text-muted-foreground tabular-nums mt-0.5">
                  {c.owned} / {c.total}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {!isPremium && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Sheet open={!!openCollection} onOpenChange={(o) => !o && setOpenCollection(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="font-display flex items-center gap-2">
              <span>{openCollection?.icon || '✨'}</span>
              {openCollection?.title}
            </SheetTitle>
          </SheetHeader>
          {openCollection && (
            <p className="text-[11px] font-display text-muted-foreground tabular-nums mb-3">
              {openCollection.owned} / {openCollection.total} espèces collectées
            </p>
          )}
          {taxa === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="space-y-1.5 pb-6">
              {taxa.map((t) => (
                <li
                  key={t.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                    t.owned ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${rarityDot[t.rarity] || 'bg-muted-foreground'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-display font-semibold text-foreground truncate">
                      {t.vernacular_name}
                    </span>
                    {t.scientific_name && (
                      <span className="block text-[10px] font-display italic text-muted-foreground truncate">
                        {t.scientific_name}
                      </span>
                    )}
                  </span>
                  {t.owned ? (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default SpecializedCollections;
