/**
 * Configuration de l'UI système (status bar) sur iOS / Android.
 *
 * iOS : la WebView est plein écran, on compense via les safe areas CSS.
 * Android 15+ (SDK 35/36) : l'affichage bord à bord est obligatoire, les
 * encarts système sont appliqués nativement (MainActivity), donc on ne
 * tente plus de désactiver l'overlay ni de colorer les barres.
 */
export async function setupNativeStatusBar() {
  if (typeof window === 'undefined') return;

  const cap = (window as any).Capacitor;
  const isNative =
    !!cap && (typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : !!cap.isNative);
  if (!isNative) return;

  const platform: string = cap.getPlatform?.() ?? '';
  document.documentElement.classList.add('is-native-app');
  if (platform === 'ios') document.documentElement.classList.add('is-native-ios');
  if (platform === 'android') document.documentElement.classList.add('is-native-android');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Thème clair uniquement -> icônes système sombres
    await StatusBar.setStyle({ style: Style.Light });

    if (platform === 'ios') {
      // iOS : la WebView ne passe pas sous la status bar
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (err) {
    console.warn('StatusBar setup skipped', err);
  }
}
