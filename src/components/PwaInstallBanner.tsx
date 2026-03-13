import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';

const PwaInstallBanner = () => {
  const { shouldShowPrompt, promptInstall, dismissInstall, isInstalled } = usePwaInstall();

  if (!shouldShowPrompt || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-md mx-auto rounded-2xl bg-card border border-border shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-foreground">
            Installer Faunex
          </p>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Ajoute l'app sur ton écran d'accueil pour un accès rapide, même hors ligne&nbsp;!
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="font-display font-semibold gap-1.5 text-xs"
              onClick={promptInstall}
            >
              <Download className="w-3.5 h-3.5" />
              Installer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="font-display text-xs text-muted-foreground"
              onClick={dismissInstall}
            >
              Plus tard
            </Button>
          </div>
        </div>
        <button
          onClick={dismissInstall}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
