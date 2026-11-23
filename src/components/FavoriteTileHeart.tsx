import { Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Petit marque-page rose plein signalant une espèce favorite, sur les vignettes de grille uniquement. */
const FavoriteTileHeart = () => {
  const { t } = useTranslation();
  return (
    <Bookmark
      aria-label={t('bestiary.collections.favorites')}
      className="h-4 w-4 fill-chip-favorites text-chip-favorites"
      strokeWidth={2.2}
    />
  );
};

export default FavoriteTileHeart;
