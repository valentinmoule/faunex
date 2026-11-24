import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Infinity as InfinityIcon } from 'lucide-react';
import CategoryLeaderboard from '@/components/CategoryLeaderboard';
import { Chip as RoundChip, categoryChipImage } from '@/components/CategoryChipRow';

const LEADERBOARD_CATEGORIES = ['Mammifères', 'Oiseaux', 'Insectes', 'Poissons', 'Reptiles', 'Amphibiens', 'Arachnides', 'Mollusques', 'Crustacés'];

/** Classement affiché directement dans Explorateurs (sans changer de page). */
export default function ExplorersLeaderboard({ mode = 'league' }: { mode?: 'league' | 'honors' }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | string>('all');

  return (
    <section className="px-4">
      {mode === 'honors' && (
      <div role="radiogroup" aria-label={t('social.leaderboard.ranking')} className="no-scrollbar -mx-3 mb-1 mt-2 flex gap-1 overflow-x-auto px-3 pt-1 pb-0.5">
        <RoundChip selected={filter === 'all'} label={t('social.leaderboard.tabAllTime')} onClick={() => setFilter('all')}>
          <span className="flex h-full w-full items-center justify-center bg-chip-all"><InfinityIcon className="h-7 w-7 text-foreground" strokeWidth={2.25} /></span>
        </RoundChip>
        {LEADERBOARD_CATEGORIES.map((category) => (
          <RoundChip key={category} selected={filter === category} label={t(`bestiary.categoryNames.${category}`, { defaultValue: category })} onClick={() => setFilter(category)}>
            <img src={categoryChipImage(category)} alt="" width={64} height={64} decoding="async" className="h-full w-full object-cover" />
          </RoundChip>
        ))}
      </div>
      )}
      {mode === 'honors' && (
        <div className="flex h-[34px] items-center px-1 pt-1">
          <h2 className="min-w-0 truncate text-[15px] font-display font-bold text-foreground">
            {filter === 'all' ? t('social.leaderboard.titleAllTime') : t(`bestiary.categoryNames.${filter}`, { defaultValue: filter })}
          </h2>
        </div>
      )}
      <CategoryLeaderboard
        key={`${mode}-${filter}`}
        category={mode === 'league' || filter === 'all' ? 'all' : filter}
        inline
        period={mode === 'league' ? 'week' : 'all'}
        scope="global"
        showResetBadge={false}
        metric={mode === 'league' ? 'league' : filter === 'all' ? 'xp' : 'captures'}
      />
    </section>
  );
}
