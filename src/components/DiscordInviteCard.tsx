import { useState, useEffect } from 'react';
import { X, MessageCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'faunex_discord_card_closed';
const DISCORD_INVITE_URL = 'https://discord.gg/ZrQhZUZG2';
export const COMMUNITY_BADGE_ID = 'community_member';
export const COMMUNITY_BADGE_XP = 50;

interface DiscordInviteCardProps {
  onBadgeEarned?: () => void;
}

const DiscordInviteCard = ({ onBadgeEarned }: DiscordInviteCardProps) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const closed = localStorage.getItem(STORAGE_KEY) === '1';
    setDismissed(closed);
    // Petit délai pour une apparition fluide après le montage
    const timer = setTimeout(() => setVisible(!closed), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
    setTimeout(() => setDismissed(true), 300);
  };

  const handleJoin = () => {
    window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer');
  };

  if (dismissed) return null;

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card shadow-card">
        {/* Subtle decorative pattern */}
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-amber/5 blur-2xl pointer-events-none" />

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-display font-bold text-foreground leading-tight">
                  💬 Rejoins la communauté Faunex
                </h3>
                <button
                  onClick={handleDismiss}
                  className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Fermer l'invitation Discord"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Échange avec les autres utilisateurs, partage tes meilleures captures, propose des idées pour améliorer Faunex et suis les dernières nouveautés du projet.
              </p>

              <button
                onClick={handleJoin}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Rejoindre le Discord
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordInviteCard;
