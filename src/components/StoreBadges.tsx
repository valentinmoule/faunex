import { type ImgHTMLAttributes } from 'react';

export const AppStoreBadge = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <img
    src="/store-badges/app-store-fr.png"
    alt="Télécharger dans l’App Store"
    width="1012"
    height="320"
    loading="lazy"
    {...props}
  />
);

export const PlayStoreBadge = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <img
    src="/store-badges/google-play-fr.png"
    alt="Disponible sur Google Play"
    width="646"
    height="192"
    loading="lazy"
    {...props}
  />
);
