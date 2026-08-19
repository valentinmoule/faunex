import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSpeciesGroup, BREED_GROUPS, MIN_BREEDS_PER_GROUP } from '@/lib/breedGroups';
import { getCategoryEmoji, normalizeCategory } from '@/lib/bestiary';
import {
  STATIC_BADGES,
  collectionBadge,
  rank1Badge,
  type BadgeDef,
} from '@/lib/badges';
import { COMMUNITY_BADGE_ID, COMMUNITY_BADGE_XP } from '@/components/DiscordInviteCard';

export interface BadgeProgress {
  badge: BadgeDef;
  progress: number;
  earned: boolean;
  claimed: boolean;
}

const COMMUNITY_BADGE: BadgeDef = {
  id: COMMUNITY_BADGE_ID,
  name: 'Membre de la communauté',
  icon: '💬',
  description: 'Rejoindre le Discord Faunex',
  total: 1,
  group: 'social',
  xp: COMMUNITY_BADGE_XP,
};

const norm = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const catCount = (captures: { category?: string | null }[], needle: string) =>
  captures.filter((c) => norm(c.category || '').includes(needle)).length;

/** Loads every animal of the catalogue (paginated) — needed for collection progress. */
const fetchCatalogue = async () => {
  let all: { name: string; scientific_name: string | null; category: string }[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data } = await supabase
      .from('animals')
      .select('name, scientific_name, category')
      .order('name')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data as any);
    if (data.length < pageSize) break;
    page++;
  }
  return all;
};

/**
 * Computes the full badge list of a user: static badges, one badge per
 * completed collection and one badge per category where the user is #1.
 */
export const useBadges = (userId: string | undefined, level: number, regionsExplored: number, refreshKey = 0) => {
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const [capturesRes, claimedRes, followersRes, followingRes, catalogue] = await Promise.all([
        supabase
          .from('captures')
          .select('animal_name, scientific_name, category, rarity, latitude, created_at')
          .eq('user_id', userId)
          .eq('status', 'approved'),
        supabase.from('user_badges').select('badge_id').eq('user_id', userId),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('explorer_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        fetchCatalogue(),
      ]);

      if (cancelled) return;

      const claimedSet = new Set((claimedRes.data || []).map((b: any) => b.badge_id));
      const followers = followersRes.count || 0;
      const following = followingRes.count || 0;

      // one entry per distinct species
      const seen = new Set<string>();
      const captures = (capturesRes.data || []).filter((c: any) => {
        const key = (c.animal_name || '').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const total = captures.length;
      const rareCount = captures.filter((c: any) => ['rare', 'epic', 'mythic'].includes(c.rarity)).length;
      const epicCount = captures.filter((c: any) => ['epic', 'mythic'].includes(c.rarity)).length;
      const mythicCount = captures.filter((c: any) => c.rarity === 'mythic').length;
      const geoCount = captures.filter((c: any) => c.latitude != null).length;
      const hours = captures.map((c: any) => (c.created_at ? new Date(c.created_at).getHours() : -1));
      const nightOwl = hours.some((h) => h >= 21 || (h >= 0 && h < 5));
      const earlyBird = hours.some((h) => h >= 5 && h < 8);

      const myCategories = new Set(
        captures.map((c: any) => normalizeCategory(c.category || '')).filter(Boolean),
      );

      // ---- Collection progress ----
      const capturedNames = new Set(captures.map((c: any) => (c.animal_name || '').toLowerCase()));
      const groupStats = new Map<string, { total: number; captured: number }>();
      catalogue.forEach((a) => {
        const group = getSpeciesGroup(a.name, a.scientific_name, a.category);
        if (!group) return;
        const entry = groupStats.get(group.key) || { total: 0, captured: 0 };
        entry.total++;
        if (capturedNames.has(a.name.toLowerCase())) entry.captured++;
        groupStats.set(group.key, entry);
      });

      const collectionBadges: BadgeProgress[] = BREED_GROUPS.flatMap((group) => {
        const stats = groupStats.get(group.key);
        if (!stats || stats.total < MIN_BREEDS_PER_GROUP) return [];
        // Only surface collections the user already started (or completed),
        // otherwise the list would be unreadable.
        if (stats.captured === 0 && !claimedSet.has(`collection_${group.key}`)) return [];
        const def = collectionBadge(group.key, group.label, group.emoji, stats.total);
        return [{
          badge: def,
          progress: stats.captured,
          earned: stats.captured >= stats.total,
          claimed: claimedSet.has(def.id),
        }];
      }).sort((a, b) => a.badge.name.localeCompare(b.badge.name, 'fr'));

      // ---- Leaderboard ranks ----
      const cats = Array.from(myCategories);
      const ranks = await Promise.all(
        cats.map(async (cat) => {
          const { data } = await supabase.rpc('my_category_rank', { p_category: cat });
          const row: any = Array.isArray(data) ? data[0] : data;
          return { cat, rank: row?.rank ? Number(row.rank) : null };
        }),
      );
      if (cancelled) return;

      const bestRank = ranks.reduce<number | null>(
        (acc, r) => (r.rank != null && (acc == null || r.rank < acc) ? r.rank : acc),
        null,
      );

      const rankBadges: BadgeProgress[] = ranks
        .filter((r) => r.rank === 1 || claimedSet.has(`rank1_${r.cat.toLowerCase()}`))
        .map((r) => {
          const def = rank1Badge(r.cat, getCategoryEmoji(r.cat));
          return {
            badge: def,
            progress: r.rank === 1 ? 1 : claimedSet.has(def.id) ? 1 : 0,
            earned: r.rank === 1 || claimedSet.has(def.id),
            claimed: claimedSet.has(def.id),
          };
        });

      const progressMap: Record<string, number> = {
        first_capture: Math.min(total, 1),
        explorer_10: Math.min(total, 10),
        explorer_25: Math.min(total, 25),
        explorer_50: Math.min(total, 50),
        explorer_100: Math.min(total, 100),
        level_5: Math.min(level, 5),
        level_10: Math.min(level, 10),
        regions_3: Math.min(regionsExplored, 3),
        regions_10: Math.min(regionsExplored, 10),
        geo_10: Math.min(geoCount, 10),
        night_owl: nightOwl ? 1 : 0,
        early_bird: earlyBird ? 1 : 0,
        birds_5: Math.min(catCount(captures, 'oiseau'), 5),
        mammals_5: Math.min(catCount(captures, 'mammif'), 5),
        insects_5: Math.min(catCount(captures, 'insecte'), 5),
        reptiles_3: Math.min(catCount(captures, 'reptile'), 3),
        amphibians_3: Math.min(catCount(captures, 'amphibien'), 3),
        fishes_3: Math.min(catCount(captures, 'poisson'), 3),
        arachnids_3: Math.min(catCount(captures, 'arachnide'), 3),
        molluscs_3: Math.min(catCount(captures, 'mollusque'), 3),
        crustaceans_3: Math.min(catCount(captures, 'crustace'), 3),
        categories_all: Math.min(myCategories.size, 9),
        rare_1: Math.min(rareCount, 1),
        rare_10: Math.min(rareCount, 10),
        legendary_1: Math.min(epicCount, 1),
        legendary_5: Math.min(epicCount, 5),
        mythic_1: Math.min(mythicCount, 1),
        mythic_3: Math.min(mythicCount, 3),
        podium_any: bestRank != null && bestRank <= 3 ? 1 : 0,
        top10_any: bestRank != null && bestRank <= 10 ? 1 : 0,
        social_3: Math.min(following, 3),
        social_10: Math.min(following, 10),
        followers_5: Math.min(followers, 5),
        followers_25: Math.min(followers, 25),
        [COMMUNITY_BADGE_ID]: claimedSet.has(COMMUNITY_BADGE_ID) ? 1 : 0,
      };

      const staticBadges: BadgeProgress[] = [...STATIC_BADGES, COMMUNITY_BADGE].map((b) => ({
        badge: b,
        progress: progressMap[b.id] || 0,
        earned: (progressMap[b.id] || 0) >= b.total,
        claimed: claimedSet.has(b.id),
      }));

      setBadges([...staticBadges, ...collectionBadges, ...rankBadges]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, level, regionsExplored, refreshKey]);

  const markClaimed = useCallback((badgeId: string) => {
    setBadges((prev) => prev.map((b) => (b.badge.id === badgeId ? { ...b, claimed: true } : b)));
  }, []);

  return { badges, loading, markClaimed };
};
