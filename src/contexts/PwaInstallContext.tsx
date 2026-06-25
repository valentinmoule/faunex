import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  promptInstall: () => Promise<void>;
  dismissInstall: () => void;
  resetDismiss: () => void;
  shouldShowPrompt: boolean;
}

const PwaInstallContext = createContext<PwaInstallContextType>({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  promptInstall: async () => {},
  dismissInstall: () => {},
  resetDismiss: () => {},
  shouldShowPrompt: false,
});

export const usePwaInstall = () => useContext(PwaInstallContext);

const DISMISSED_KEY = 'faunex_pwa_install_dismissed';

export const PwaInstallProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  useEffect(() => {
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
    if (!deferredPrompt) return;
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

  const canInstall = !!deferredPrompt && !isInstalled;
  const shouldShowPrompt = canInstall && !dismissed;

  return (
    <PwaInstallContext.Provider value={{ canInstall, isInstalled, promptInstall, dismissInstall, shouldShowPrompt }}>
      {children}
    </PwaInstallContext.Provider>
  );
};
