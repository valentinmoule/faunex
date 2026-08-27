/**
 * Configuration de l'UI système (status bar) sur iOS / Android.
 *
 * iOS : la WebView est plein écran, on compense via les safe areas CSS.
 * Android 15+ (SDK 35/36) : l'affichage bord à bord est obligatoire et
 * l'encart supérieur réel est appliqué à la WebView dans MainActivity.
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

    // Android est géré exclusivement par MainActivity afin d'éviter que le
    // plugin ne réinitialise les encarts après le premier rendu.
    if (platform === 'ios') await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('StatusBar setup skipped', err);
  }
}
