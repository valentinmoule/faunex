import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { useLeague } from '@/hooks/useLeague';
import { leagueTier, timeUntilWeekEnd } from '@/lib/leagues';

/** Aperçu de la ligue hebdomadaire globale, affiché sur le profil. */
const LeagueCard = () => {
  const navigate = useNavigate();
  const { summary, standings, loading } = useLeague(true);

  const podium = standings.slice(0, 3);
  const userIds = useMemo(() => podium.map((r) => r.user_id), [podium]);
  const premiumIds = usePremiumUsers(userIds);

  if (loading || !summary) return null;

  const tier = leagueTier(summary.tier);

  return (
    <button
      onClick={() => navigate('/ligue')}
      className={`w-full flex items-center justify-between gap-3 rounded-2xl border ${tier.border} ${tier.bg} px-4 py-3 text-left shadow-sm active:scale-[0.99] transition-transform`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 shrink-0 rounded-full bg-card flex items-center justify-center text-xl shadow-sm">
          {tier.emoji}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-bold">
            Ligue {tier.label}
          </p>
          <p className={`text-[13px] font-display font-bold truncate ${tier.text}`}>
            {summary.rank}
            <sup>{summary.rank === 1 ? 'er' : 'e'}</sup> sur {summary.group_size} · {summary.points} pts
          </p>
          <p className="text-[10px] text-muted-foreground font-display">
            Fin de semaine dans {timeUntilWeekEnd()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {podium.length > 0 ? (
          <div className="flex -space-x-2">
            {podium.map((r) => (
              <PremiumAvatar
                key={r.user_id}
                avatarUrl={r.avatar_url}
                name={r.display_name || r.username || '?'}
                isPremium={premiumIds.has(r.user_id)}
                size="sm"
                className="border-2 border-card"
              />
            ))}
          </div>
        ) : (
          <Trophy className="w-4 h-4 text-muted-foreground" />
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
};

export default LeagueCard;
