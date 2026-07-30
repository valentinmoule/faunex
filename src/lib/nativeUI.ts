/**
 * Configuration de l'UI système (status bar) sur iOS / Android.
 *
 * Sans cela, la WebView Capacitor s'affiche sous la status bar :
 * le header de l'app se mélange avec l'heure, le wifi et la batterie.
 */
export async function setupNativeStatusBar() {
  if (typeof window === 'undefined') return;

  const cap = (window as any).Capacitor;
  const isNative =
    !!cap && (typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : !!cap.isNative);
  if (!isNative) return;

  document.documentElement.classList.add('is-native-app');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // La WebView ne passe plus sous la status bar
    await StatusBar.setOverlaysWebView({ overlay: false });
    // Thème clair uniquement -> icônes système sombres
    await StatusBar.setStyle({ style: Style.Light });
    // Android : couleur de fond identique au fond de l'app
    if (cap.getPlatform?.() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#f9f5ec' });
    }
  } catch (err) {
    console.warn('StatusBar setup skipped', err);
  }
}
