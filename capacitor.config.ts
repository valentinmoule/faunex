import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.faunex.app',
  appName: 'Faunex',
  webDir: 'dist',
  backgroundColor: '#f9f5ec',

  // Pas de `server.url` : l'app native embarque le build local (`npm run build:app`),
  // sans le site vitrine ni le blog.
  server: {
    // Origine https://localhost côté Android : nécessaire pour getUserMedia
    // (la caméra est refusée sur une origine http non sécurisée).
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
  },

  plugins: {
    SplashScreen: {
      backgroundColor: '#f9f5ec',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      launchAutoHide: true,
      launchShowDuration: 1200,
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#f9f5ec',
    },
  },
};

export default config;
