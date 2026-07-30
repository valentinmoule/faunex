import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.faunex.app',
  appName: 'faunex',
  webDir: 'dist',
  backgroundColor: '#f9f5ec',
  plugins: {
    SplashScreen: {
      backgroundColor: '#f9f5ec',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#f9f5ec',
    },
  },

  // Pas de `server.url` : l'app native embarque le build local (`npm run build:app`),
  // sans le site vitrine ni le blog.
};

export default config;
