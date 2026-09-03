import { type ImgHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

export const AppStoreBadge = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  const { t } = useTranslation();
  return (
    <img
      src="/store-badges/app-store-fr.png"
      alt={t('marketing.storeBadges.appStoreAlt')}
      width="1012"
      height="320"
      loading="lazy"
      {...props}
    />
  );
};

export const PlayStoreBadge = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  const { t } = useTranslation();
  return (
    <img
      src="/store-badges/google-play-fr.png"
      alt={t('marketing.storeBadges.playStoreAlt')}
      width="646"
      height="192"
      loading="lazy"
      {...props}
    />
  );
};
