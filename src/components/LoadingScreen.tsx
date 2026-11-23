import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <img src="/logo-transparent.png" alt={t('map.loadingScreen.logoAlt')} className="h-20 w-auto animate-pulse" />
      <span className="text-muted-foreground font-display text-sm">{t('map.loadingScreen.loading')}</span>
    </main>
  );
}
