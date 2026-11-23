import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Petit cœur plein signalant une espèce favorite, sur les vignettes de grille uniquement. */
const FavoriteTileHeart = () => {
  const { t } = useTranslation();
  return (
    <Heart
      aria-label={t('bestiary.collections.favorites')}
      className="h-4 w-4 fill-destructive text-destructive drop-shadow-[0_1px_2px_hsl(var(--foreground)/0.45)]"
      strokeWidth={2.2}
    />
  );
};

export default FavoriteTileHeart;
