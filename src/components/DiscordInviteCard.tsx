import { useState, useEffect } from 'react';
import { X, MessageCircle, ExternalLink, Sparkles, Award } from 'lucide-react';
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
    const timer = setTimeout(() => setVisible(!closed), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
    setTimeout(() => setDismissed(true), 300);
  };

  const handleJoin = async () => {
    window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer');
    try {
      const { data: claimed } = await supabase.rpc('claim_badge', {
        p_badge_id: COMMUNITY_BADGE_ID,
        p_xp_reward: COMMUNITY_BADGE_XP,
      });
      if (claimed) {
        toast.success(`Badge « Membre de la communauté » débloqué ! +${COMMUNITY_BADGE_XP} XP 🎉`);
        onBadgeEarned?.();
      }
    } catch {
      // silencieux : l'ouverture du Discord reste prioritaire
    }
  };

  if (dismissed) return null;

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <div className="relative tape-strip">
        {/* Carte style note de terrain */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-foreground/20 bg-paper shadow-card">
          {/* Motif topographique subtil */}
          <div className="absolute inset-0 bg-topo opacity-40 pointer-events-none" />

          {/* Tache aquarelle décorative */}
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-amber/10 blur-3xl pointer-events-none" />

          <div className="relative p-5">
            {/* En-tête avec icône et fermeture */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-6 h-6 text-primary" />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber text-amber-dark text-[10px] flex items-center justify-center border-2 border-background shadow-sm">
                    💬
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-display font-black text-foreground leading-tight">
                    Rejoins la communauté Faunex
                  </h3>
                  <p className="mt-0.5 text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide">
                    Discord officiel
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Fermer l'invitation Discord"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Échange avec les autres explorateurs, partage tes meilleures captures, propose des idées pour améliorer Faunex et suis les dernières nouveautés du projet.
            </p>

            {/* CTA principal */}
            <button
              onClick={handleJoin}
              className="w-full group flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm shadow-card hover:shadow-card-hover hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4 opacity-80 group-hover:animate-pulse" />
              Rejoindre le Discord
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Mention badge */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <Award className="w-3.5 h-3.5 text-amber" />
              <span>
                Débloque le badge <span className="font-semibold text-foreground">Membre de la communauté</span> +{COMMUNITY_BADGE_XP} XP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordInviteCard;
