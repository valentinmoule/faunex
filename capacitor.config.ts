import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.faunex.app',
  appName: 'faunex',
  webDir: 'dist',
  server: {
    url: 'https://181091a8-bd70-4e77-aac6-2d50eae60ac0.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
