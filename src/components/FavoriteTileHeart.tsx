import { Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Petit marque-page vert plein signalant une espèce favorite, sur les vignettes de grille uniquement. */
const FavoriteTileHeart = () => {
  const { t } = useTranslation();
  return (
    <Bookmark
      aria-label={t('bestiary.collections.favorites')}
      className="h-4 w-4 fill-primary text-primary drop-shadow-[0_1px_2px_hsl(var(--foreground)/0.45)]"
      strokeWidth={2.2}
    />
  );
};

export default FavoriteTileHeart;
