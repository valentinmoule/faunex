import { useEffect, useMemo, useRef, useState } from 'react';
import { thumbUrl } from '@/lib/imageUrl';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import RarityBadge from '@/components/RarityBadge';
import { supabase } from '@/integrations/supabase/client';
import { getCollectionArt } from '@/lib/collectionArt';
import { normalizeCategory } from '@/lib/bestiary';
import { useContestWinnerCaptures } from '@/hooks/usePhotoContest';
import { CollectorEditionMark } from '@/components/social/CollectorEdition';
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
  const { data: winners } = useContestWinnerCaptures();
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
                    src={thumbUrl(entry.kind === 'custom' ? customCoverFor(collections.find((c) => c.id === entry.id)!) : standardCoverFor(entry.key, entry.label), 160, 70)}
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

      {openEntry && (
        <CollectionStory
          key={openId}
          label={openEntry.label}
          cover={openEntry.kind === 'custom' ? customCoverFor(openCustom!) : standardCoverFor(openEntry.key, openEntry.label)}
          subtitle={openEntry.kind === 'custom'
            ? t('bestiary.customCollections.progress', { captured: openCards.length, total: openTotal })
            : t('bestiary.customCollections.showcaseCapturedCount', { count: openCards.length })}
          cards={openCards}
          winners={winners}
          onClose={() => setOpenId(null)}
          onNextCollection={() => {
            const idx = entries.findIndex((e) => (e.kind === 'custom' ? `custom:${e.id}` : `std:${e.key}`) === openId);
            const next = entries[idx + 1];
            setOpenId(next ? (next.kind === 'custom' ? `custom:${next.id}` : `std:${next.key}`) : null);
          }}
          onPrevCollection={() => {
            const idx = entries.findIndex((e) => (e.kind === 'custom' ? `custom:${e.id}` : `std:${e.key}`) === openId);
            const prev = entries[idx - 1];
            if (prev) setOpenId(prev.kind === 'custom' ? `custom:${prev.id}` : `std:${prev.key}`);
          }}
          onSelectCard={(card) => { setOpenId(null); onSelectCard(card); }}
        />
      )}
    </>
  );
};

const STORY_DURATION_MS = 5000;

/**
 * Lecture plein écran d'une collection épinglée, façon stories Instagram :
 * défilement automatique, toucher à gauche/droite pour reculer/avancer,
 * appui long pour mettre en pause.
 */
export const CollectionStory = ({
  label,
  cover,
  subtitle,
  cards,
  winners,
  onClose,
  onNextCollection,
  onPrevCollection,
  onSelectCard,
}: {
  label: string;
  cover: string;
  subtitle: string;
  cards: AnimalCard[];
  winners?: Set<string>;
  onClose: () => void;
  onNextCollection: () => void;
  onPrevCollection: () => void;
  onSelectCard: (card: AnimalCard) => void;
}) => {
  const { t } = useTranslation();
  const { speciesName } = useSpeciesName();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const pressStartRef = useRef(0);
  const count = Math.max(cards.length, 1);
  const card = cards[index];

  const goNext = () => {
    if (index + 1 < cards.length) { setIndex(index + 1); setProgress(0); }
    else onNextCollection();
  };
  const goPrev = () => {
    if (index > 0) { setIndex(index - 1); setProgress(0); }
    else if (progress > 0.15 || !onPrevCollection) setProgress(0);
    else onPrevCollection();
  };
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        setProgress((p) => {
          const np = p + dt / STORY_DURATION_MS;
          if (np >= 1) { queueMicrotask(() => goNextRef.current()); return 1; }
          return np;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleTap = (e: React.PointerEvent<HTMLDivElement>) => {
    pausedRef.current = false;
    if (performance.now() - pressStartRef.current > 300) return; // appui long = pause seulement
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 3) goPrev();
    else goNext();
  };

  const image = card?.image ?? cover;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.max(0, Math.floor(diff / 60000));
    if (mins < 60) return t('social.common.timeAgo_min', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('social.common.timeAgo_hour', { count: hours });
    return t('social.common.timeAgo_day', { count: Math.floor(hours / 24) });
  };

  return createPortal(
    <div className="fixed inset-0 z-[1400] overflow-hidden bg-foreground text-background select-none" role="dialog" aria-modal="true" aria-label={label}>
      <img
        key={image}
        src={image}
        alt={card ? speciesName(card.name) : label}
        className="absolute inset-0 h-full w-full object-cover animate-fade-in"
        draggable={false}
      />
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-foreground/60 to-transparent" />

      <div
        className="absolute inset-0"
        onPointerDown={() => { pausedRef.current = true; pressStartRef.current = performance.now(); }}
        onPointerUp={handleTap}
        onPointerCancel={() => { pausedRef.current = false; }}
        onPointerLeave={() => { pausedRef.current = false; }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-background/35">
              <div
                className="h-full rounded-full bg-background"
                style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <img src={thumbUrl(cover, 120, 70)} alt="" className="h-9 w-9 rounded-full border-2 border-background object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold">{label}</p>
            <p className="truncate text-[11px] text-background/80">{card ? timeAgo(card.discoveredAt) : subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Fermer')}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl bg-card text-foreground shadow-sm active:scale-95 transition-transform"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-foreground">
        {card ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <RarityBadge rarity={card.rarity} plain showLabel />
              <p className="mt-1 truncate font-display text-xl font-bold">{speciesName(card.name)}</p>
              {card.scientificName && <p className="truncate text-xs italic text-muted-foreground">{card.scientificName}</p>}
              {winners?.has(card.id) && <CollectorEditionMark className="mt-1 text-[10px]" />}
            </div>
            <button
              type="button"
              onClick={() => onSelectCard(card)}
              className="shrink-0 rounded-full bg-primary px-4 py-2.5 font-display text-[13px] font-bold text-primary-foreground active:scale-95 transition-transform"
            >
              {t('bestiary.customCollections.storyViewCard')}
            </button>
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">{t('bestiary.customCollections.showcaseEmpty')}</p>
        )}
      </div>
    </div>,
    document.body,
  );
};
