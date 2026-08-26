import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Minus, Timer } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import LoadingScreen from '@/components/LoadingScreen';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { useLeague } from '@/hooks/useLeague';
import {
  DEMOTION_SLOTS,
  LEAGUE_TIERS,
  OUTCOME_LABEL,
  PROMOTION_SLOTS,
  leagueTier,
  leagueZone,
  timeUntilWeekEnd,
} from '@/lib/leagues';

const zoneRowClass: Record<string, string> = {
  promotion: 'bg-primary/[0.06]',
  stay: '',
  demotion: 'bg-destructive/[0.06]',
};

const LeaguePage = () => {
  const navigate = useNavigate();
  const { summary, standings, loading } = useLeague(true);

  const userIds = useMemo(() => standings.map((r) => r.user_id), [standings]);
  const premiumIds = usePremiumUsers(userIds);

  if (loading) return <LoadingScreen />;

  const tier = leagueTier(summary?.tier);
  const size = summary?.group_size ?? standings.length;

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-display font-bold text-primary">Ligue</h1>
        </div>
      </PageHeader>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* Bandeau du palier courant */}
        <section className={`rounded-3xl border ${tier.border} ${tier.bg} p-5 text-center`}>
          <div className="text-4xl mb-1">{tier.emoji}</div>
          <h2 className={`text-2xl font-display font-bold ${tier.text}`}>Ligue {tier.label}</h2>
          {summary && (
            <p className="text-[13px] font-display text-muted-foreground mt-1">
              {summary.rank}
              <sup>{summary.rank === 1 ? 'er' : 'e'}</sup> sur {size} · {summary.points} pts cette semaine
            </p>
          )}
          <p className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-card text-[11px] font-display font-semibold text-foreground shadow-sm">
            <Timer className="w-3.5 h-3.5 text-muted-foreground" />
            Fin de semaine dans {timeUntilWeekEnd()}
          </p>
        </section>

        {/* Résultat de la semaine précédente */}
        {summary?.prev_outcome && (
          <div className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              {summary.prev_outcome === 'promoted' ? (
                <ChevronUp className="w-4 h-4 text-primary" />
              ) : summary.prev_outcome === 'demoted' ? (
                <ChevronDown className="w-4 h-4 text-destructive" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-display font-bold text-foreground">
                {OUTCOME_LABEL[summary.prev_outcome] || 'Semaine terminée'}
              </p>
              <p className="text-[11px] text-muted-foreground font-display">
                Semaine dernière : {summary.prev_rank}
                <sup>{summary.prev_rank === 1 ? 'er' : 'e'}</sup> en ligue{' '}
                {leagueTier(summary.prev_tier).label}
              </p>
            </div>
          </div>
        )}

        {/* Classement du groupe */}
        <section className="rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-[13px] font-display font-bold text-foreground">Mon groupe</p>
            <p className="text-[11px] text-muted-foreground font-display">
              Top {PROMOTION_SLOTS} : promotion · {DEMOTION_SLOTS} derniers : relégation
            </p>
          </div>
          <ul className="divide-y divide-border">
            {standings.map((r) => {
              const zone = leagueZone(r.rank, size, summary?.tier ?? 0);
              return (
                <li
                  key={r.user_id}
                  className={`flex items-center gap-3 px-5 py-2.5 ${zoneRowClass[zone]} ${
                    r.is_me ? 'ring-1 ring-inset ring-primary/30' : ''
                  }`}
                >
                  <span
                    className={`w-6 text-center text-[13px] font-display font-bold ${
                      r.is_me ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {r.rank}
                  </span>
                  <PremiumAvatar
                    avatarUrl={r.avatar_url}
                    name={r.display_name || r.username || '?'}
                    isPremium={premiumIds.has(r.user_id)}
                    size="md"
                  />
                  <p
                    className={`flex-1 min-w-0 truncate text-[13px] font-display ${
                      r.is_me ? 'font-bold text-primary' : 'text-foreground'
                    }`}
                  >
                    {r.is_me ? 'Toi' : r.display_name || r.username || 'Explorateur'}
                  </p>
                  {zone === 'promotion' && <ChevronUp className="w-3.5 h-3.5 text-primary shrink-0" />}
                  {zone === 'demotion' && <ChevronDown className="w-3.5 h-3.5 text-destructive shrink-0" />}
                  <span className="text-[13px] font-display font-bold text-foreground shrink-0">{r.points}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Échelle des ligues */}
        <section className="rounded-3xl bg-card border border-border p-4 shadow-sm">
          <p className="text-[13px] font-display font-bold text-foreground mb-1">Les 7 ligues</p>
          <p className="text-[11px] text-muted-foreground font-display mb-3">
            Une seule ligue par explorateur : elle mesure ton activité globale, pas tes catégories.
          </p>
          <div className="flex flex-wrap gap-2">
            {LEAGUE_TIERS.map((t) => (
              <span
                key={t.tier}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-display font-semibold ${
                  t.tier === (summary?.tier ?? 0)
                    ? `${t.bg} ${t.border} ${t.text}`
                    : 'border-border text-muted-foreground'
                }`}
              >
                {t.emoji} {t.label}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default LeaguePage;
