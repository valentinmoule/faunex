import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { IS_NATIVE_APP } from '@/lib/platform';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isNative: boolean;
  promptInstall: () => Promise<void>;
  dismissInstall: () => void;
  resetDismiss: () => void;
  shouldShowPrompt: boolean;
  guideOpen: boolean;
  openInstallGuide: () => void;
  closeInstallGuide: () => void;
}

const PwaInstallContext = createContext<PwaInstallContextType>({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  isNative: false,
  promptInstall: async () => {},
  dismissInstall: () => {},
  resetDismiss: () => {},
  shouldShowPrompt: false,
  guideOpen: false,
  openInstallGuide: () => {},
  closeInstallGuide: () => {},
});

export const usePwaInstall = () => useContext(PwaInstallContext);

const DISMISSED_KEY = 'faunex_pwa_install_dismissed';

export const PwaInstallProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(IS_NATIVE_APP);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  useEffect(() => {
    // Sur les apps natives iOS / Android, on ne propose jamais l'installation PWA
    if (IS_NATIVE_APP) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS/iPadOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && 'ontouchend' in document);
    setIsIos(isIosDevice);

    // Check if already installed as standalone
    const mq = window.matchMedia('(display-mode: standalone)');
    if (mq.matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt || IS_NATIVE_APP) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }, []);

  const resetDismiss = useCallback(() => {
    setDismissed(false);
    localStorage.removeItem(DISMISSED_KEY);
  }, []);

  const [guideOpen, setGuideOpen] = useState(false);
  const openInstallGuide = useCallback(() => {
    if (IS_NATIVE_APP) return;
    setGuideOpen(true);
  }, []);
  const closeInstallGuide = useCallback(() => setGuideOpen(false), []);

  const canInstall = !IS_NATIVE_APP && !!deferredPrompt && !isInstalled;
  const shouldShowPrompt = !IS_NATIVE_APP && (canInstall || (isIos && !isInstalled)) && !dismissed;

  return (
    <PwaInstallContext.Provider value={{ canInstall, isInstalled, isIos, isNative: IS_NATIVE_APP, promptInstall, dismissInstall, resetDismiss, shouldShowPrompt, guideOpen, openInstallGuide, closeInstallGuide }}>
      {children}
    </PwaInstallContext.Provider>
  );
};
