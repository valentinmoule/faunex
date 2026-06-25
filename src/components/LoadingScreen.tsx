import React from 'react';

export default function LoadingScreen() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <img src="/pwa-icon-512.png" alt="Logo Faunex" className="w-16 h-16 animate-pulse" />
      <span className="text-muted-foreground font-display text-sm">Chargement…</span>
    </main>
  );
}
