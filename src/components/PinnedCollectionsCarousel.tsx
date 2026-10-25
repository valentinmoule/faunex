import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from 'vaul';
import { supabase } from '@/integrations/supabase/client';
import { getCollectionArt } from '@/lib/collectionArt';
import { rarityTileBorder, normalizeCategory } from '@/lib/bestiary';
import { BREED_GROUPS, getSpeciesGroup } from '@/lib/breedGroups';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';
import type { AnimalCard } from '@/data/mockData';

interface PinnedCollection {
  id: string;
  name: string;
  cover_image: string | null;
  pinned_at: string;
}

interface PinnedItem {
  collection_id: string;
  animal_name: string;
}

interface PinnedStandard {
  collection_key: string;
  pinned_at: string;
}

type ShowcaseEntry =
  | { kind: 'custom'; id: string; label: string; pinnedAt: string }
  | { kind: 'standard'; key: string; label: string; pinnedAt: string };

/**
 * Vitrine du profil : collections épinglées (personnalisées et standards),
 * affichées en ronds façon stories au-dessus des captures. Lisible par tous
 * les utilisateurs authentifiés.
 */
export const PinnedCollectionsCarousel = ({
  userId,
  captures,
  onSelectCard,
}: {
  userId: string;
  captures: AnimalCard[];
  onSelectCard: (card: AnimalCard) => void;
}) => {
  const { t } = useTranslation();
  const { speciesName } = useSpeciesName();
  const [collections, setCollections] = useState<PinnedCollection[]>([]);
  const [items, setItems] = useState<PinnedItem[]>([]);
  const [standardPins, setStandardPins] = useState<PinnedStandard[]>([]);
  const [coverRefs, setCoverRefs] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: cols }, { data: std }, { data: covers }] = await Promise.all([
        supabase
          .from('custom_collections')
          .select('id, name, cover_image, pinned_at')
          .eq('user_id', userId)
          .not('pinned_at', 'is', null)
          .order('pinned_at', { ascending: true }),
        supabase
          .from('pinned_profile_collections')
          .select('collection_key, pinned_at')
          .eq('user_id', userId)
          .order('pinned_at', { ascending: true }),
        supabase
          .from('user_collection_covers')
          .select('collection_key, capture_id')
          .eq('user_id', userId),
      ]);
      if (cancelled) return;
      setCollections((cols as PinnedCollection[]) || []);
      setStandardPins((std as PinnedStandard[]) || []);
      setCoverRefs(Object.fromEntries((covers || []).map((c) => [c.collection_key, c.capture_id])));

      if (!cols?.length) {
        setItems([]);
        return;
      }
      const { data: rows } = await supabase
        .from('custom_collection_items')
        .select('collection_id, animal_name')
        .in('collection_id', cols.map((c) => c.id))
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setItems((rows as PinnedItem[]) || []);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const capturesByName = useMemo(() => {
    const map = new Map<string, AnimalCard>();
    captures.forEach((c) => { if (!map.has(c.name)) map.set(c.name, c); });
    return map;
  }, [captures]);

  const capturesById = useMemo(() => {
    const map = new Map<string, AnimalCard>();
    captures.forEach((c) => { if (!map.has(c.id)) map.set(c.id, c); });
    return map;
  }, [captures]);

  const itemsFor = (id: string) => items.filter((i) => i.collection_id === id);
  const capturedCardsFor = (id: string) =>
    itemsFor(id).map((i) => capturesByName.get(i.animal_name)).filter((c): c is AnimalCard => !!c);

  const standardLabel = (key: string) =>
    key.startsWith('cat:') ? key.slice(4) : BREED_GROUPS.find((g) => g.key === key)?.label || key;

  /** Captures de l'explorateur qui appartiennent à cette collection standard. */
  const standardCardsFor = (key: string) =>
    captures.filter((c) =>
      key.startsWith('cat:')
        ? normalizeCategory(c.category) === key.slice(4)
        : getSpeciesGroup(c.name, c.scientificName, c.category)?.key === key,
    );

  const entries = useMemo<ShowcaseEntry[]>(() => {
    const list: ShowcaseEntry[] = [
      ...collections.map((c): ShowcaseEntry => ({ kind: 'custom', id: c.id, label: c.name, pinnedAt: c.pinned_at })),
      ...standardPins.map((p): ShowcaseEntry => ({ kind: 'standard', key: p.collection_key, label: standardLabel(p.collection_key), pinnedAt: p.pinned_at })),
    ];
    return list.sort((a, b) => a.pinnedAt.localeCompare(b.pinnedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, standardPins]);

  const customCoverFor = (col: PinnedCollection) => {
    if (col.cover_image) return col.cover_image;
    const first = capturedCardsFor(col.id)[0];
    if (first) return first.image;
    return getCollectionArt(`custom:${col.id}`, col.name).image;
  };

  const standardCoverFor = (key: string, label: string) => {
    const ref = coverRefs[key];
    if (ref) {
      const capture = capturesById.get(ref);
      if (capture) return capture.image;
    }
    return getCollectionArt(key, label).image;
  };

  if (entries.length === 0) return null;

  const openEntry = entries.find((e) => (e.kind === 'custom' ? `custom:${e.id}` : `std:${e.key}`) === openId) || null;
  const openCustom = openEntry?.kind === 'custom' ? collections.find((c) => c.id === openEntry.id) : null;
  const openCards = !openEntry
    ? []
    : openEntry.kind === 'custom'
      ? capturedCardsFor(openEntry.id)
      : standardCardsFor(openEntry.key);
  const openTotal = openEntry?.kind === 'custom' ? itemsFor(openEntry.id).length : 0;

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1" role="list" aria-label={t('bestiary.customCollections.showcase')}>
          {entries.map((entry) => (
            <button
              key={entry.kind === 'custom' ? `custom:${entry.id}` : `std:${entry.key}`}
              role="listitem"
              onClick={() => setOpenId(entry.kind === 'custom' ? `custom:${entry.id}` : `std:${entry.key}`)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <span className="rounded-full bg-gradient-to-br from-primary to-amber p-[2.5px]">
                <span className="block h-14 w-14 overflow-hidden rounded-full border-2 border-background">
                  <img
                    src={entry.kind === 'custom' ? customCoverFor(collections.find((c) => c.id === entry.id)!) : standardCoverFor(entry.key, entry.label)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </span>
              </span>
              <span className="w-full truncate text-center text-[10px] font-medium text-foreground">{entry.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Drawer.Root open={!!openEntry} onOpenChange={(o) => !o && setOpenId(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[1400] bg-foreground/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1401] max-h-[85vh] rounded-t-3xl bg-background pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none">
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted" />
            <div className="px-5 pt-4 overflow-y-auto max-h-[calc(85vh-2rem)]">
              {openEntry && (
                <>
                  <div className="text-center">
                    <h2 className="font-display text-lg font-bold">{openEntry.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {openEntry.kind === 'custom'
                        ? t('bestiary.customCollections.progress', { captured: openCards.length, total: openTotal })
                        : t('bestiary.customCollections.showcaseCapturedCount', { count: openCards.length })}
                    </p>
                  </div>
                  {openCards.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      {t('bestiary.customCollections.showcaseEmpty')}
                    </p>
                  ) : (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {openCards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => { setOpenId(null); onSelectCard(card); }}
                          className={`game-tile relative aspect-[3/4] overflow-hidden rounded-xl border-[3px] ${rarityTileBorder[card.rarity] || 'tile-border-plain'} bg-card`}
                        >
                          <img src={card.image} alt={speciesName(card.name)} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-semibold text-background">
                            {speciesName(card.name)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};
