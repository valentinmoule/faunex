import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <img src="/mascot-loading.webp" alt={t('map.loadingScreen.logoAlt')} width={112} height={112} className="fox-fur h-28 w-28 object-contain" />
      <span className="text-muted-foreground font-display text-sm">{t('map.loadingScreen.loading')}</span>
    </main>
  );
}
