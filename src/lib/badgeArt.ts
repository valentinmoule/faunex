import adventArt from '@/assets/badges/native/advent.webp';

const bundledBadgeModules = import.meta.glob<string>('../assets/badges/native/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const bundledBadgeArt = Object.fromEntries(
  Object.entries(bundledBadgeModules).map(([path, url]) => {
    const filename = path.split('/').pop() ?? '';
    return [filename.replace(/\.webp$/, ''), url];
  }),
) as Record<string, string>;

/** Badge artwork bundled with the app so native builds never depend on hosted asset routes. */
export const BADGE_ART: Record<string, string> = {
  ...bundledBadgeArt,
};

export const getBadgeArt = (badgeId: string) =>
  (badgeId.startsWith('advent_') ? adventArt : undefined) ??
  BADGE_ART[badgeId] ??
  (badgeId.startsWith('collection_')
    ? BADGE_ART.collection_default
    : badgeId.startsWith('rank1_')
    ? BADGE_ART.rank1_default
    : undefined);
