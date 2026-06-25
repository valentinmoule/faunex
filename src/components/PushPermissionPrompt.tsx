import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { isPushSupported, subscribeToPush } from '@/lib/pushNotifications';
import { toast } from 'sonner';

const STORAGE_KEY = 'faunex_push_prompt_dismissed_at';
const DISMISS_DAYS = 14;

export function PushPermissionPrompt() {
  const { session } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (!isPushSupported()) return;
    if (Notification.permission !== 'default') return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed, 10)) / 86400000;
      if (days < DISMISS_DAYS) return;
    }

    // Petit délai pour ne pas s'afficher en même temps que le banner PWA install
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [session]);

  const handleEnable = async () => {
    setLoading(true);
    const ok = await subscribeToPush();
    setLoading(false);
    if (ok) {
      toast.success('Notifications activées 🦊');
      setShow(false);
    } else {
      toast.error("Impossible d'activer les notifications");
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-2xl shadow-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-foreground text-sm">
              Active les notifications
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reçois un petit rappel quand de nouvelles espèces apparaissent près de toi.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={loading}
                className="flex-1"
              >
                {loading ? '…' : 'Activer'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Plus tard
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
