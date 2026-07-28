import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.faunex.app',
  appName: 'faunex',
  webDir: 'dist',
  // Pas de `server.url` : l'app native embarque le build local (`npm run build:app`),
  // sans le site vitrine ni le blog.
};

export default config;
