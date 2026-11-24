import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDown, ArrowUp, ChevronRight, Crown, Lock, Minus, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { avatarFallbackStyle } from '@/lib/avatarPalette';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useSwipeDownClose } from '@/lib/useSwipeDownClose';
import TimeLeftBadge from '@/components/TimeLeftBadge';

interface Row {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  captures: number;
  is_me: boolean;
  rank_change?: number | null;
  /** Nombre de captures affiché en rappel à côté de l'XP. */
  captureCount?: number;
}

interface MyRank {
  rank: number;
  captures: number;
  total_players: number;
  rank_change?: number | null;
  captureCount?: number;
}

/** Infos de la poule de ligue de la semaine. */
interface LeagueInfo { tier: number; size: number }

/** Zones d'une poule : top 5 montent (sauf Élite), 5 derniers descendent si ≥ 10 joueurs (sauf Débutant). */
export const leagueZone = (rank: number, points: number, tier: number, size: number): 'up' | 'down' | 'stay' => {
  if (rank <= 5 && tier < 6 && points > 0) return 'up';
  if (size >= 10 && tier > 0 && rank > size - 5) return 'down';
  return 'stay';
};

/** Milliseconds until next Sunday 00:00 (week runs Sunday → Sunday). */
const msUntilReset = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()), 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
};

const formatTimeLeft = (ms: number, t: (key: string, opts?: any) => string) => {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return t('social.leaderboard.timeLeftDays', { days, hours });
  if (hours > 0) return t('social.leaderboard.timeLeftHours', { hours, minutes });
  return t('social.leaderboard.timeLeftMinutes', { minutes });
};

/** Pastille « Réinitialisation dans … » du classement hebdomadaire. Utilisable
 *  seule (dans l'en-tête d'une page) ou au-dessus d'un classement. */

/** En-tête de ligue façon Duolingo : trophées des paliers, palier actuel au centre, compte à rebours. */
const LeagueHeader = ({ tier, size }: { tier: number; size: number }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(msUntilReset);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(msUntilReset()), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const box = ref.current;
    const el = box?.querySelector<HTMLElement>('[data-current="true"]');
    if (box && el) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
  }, [tier]);
  return (
    <div className="mt-2">
      <div className="px-1">
        <p className="text-[22px] font-display font-extrabold leading-tight text-foreground">{t('social.leaderboard.league.name', { tier: t(`social.leaderboard.league.tiers.${tier}`) })}</p>
        <p className="mt-0.5 text-[12px] font-display font-bold uppercase tracking-wide text-muted-foreground">{t('social.leaderboard.league.daysLeft', { time: formatTimeLeft(timeLeft, t) })}</p>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 mt-3 flex items-end gap-5 overflow-x-auto px-[38%] pb-3">
        {LEAGUE_EMOJI.map((emoji, i) => (
          <div key={i} data-current={i === tier} className="flex shrink-0 flex-col items-center">
            <span className={`relative leading-none transition-all ${i === tier ? 'text-[64px] drop-shadow-md' : 'text-[36px]'} ${i > tier ? 'opacity-30 grayscale' : ''}`} aria-hidden>
              {emoji}
              {i > tier && <Lock className="absolute bottom-0 right-0 h-4 w-4 text-foreground" />}
            </span>
          </div>
        ))}
      </div>
      {size > 0 && <p className="px-1 text-[12px] font-display text-muted-foreground">{t(tier >= 6 ? 'social.leaderboard.league.rulesTop' : 'social.leaderboard.league.rules', { size })}</p>}
      <div className="mt-3 h-px bg-border" />
    </div>
  );
};

export const LeaderboardResetBadge = ({ className = '' }: { className?: string }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(msUntilReset);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(msUntilReset()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <TimeLeftBadge
      className={className}
      value={formatTimeLeft(timeLeft, t)}
    />
  );
};

const Avatar = ({ row, isPremium, size = 'sm', className = '' }: { row: Row; isPremium?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) => (

  <PremiumAvatar
    avatarUrl={row.avatar_url}
    name={row.display_name || row.username || '?'}
    isPremium={isPremium}
    size={size}
    className={className}
  />
);

const RankMovement = ({ change, compact = false }: { change?: number | null; compact?: boolean }) => {
  const { t } = useTranslation();
  if (change === null || change === undefined) return null;
  const amount = Math.abs(change);
  const label = change > 0
    ? t('social.leaderboard.movedUp', { count: amount })
    : change < 0
      ? t('social.leaderboard.movedDown', { count: amount })
      : t('social.leaderboard.noMovement');
  const Icon = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center gap-0.5 font-display font-bold ${compact ? 'text-[9px]' : 'text-[10px]'} ${
        change > 0 ? 'text-primary' : change < 0 ? 'text-destructive' : 'text-muted-foreground'
      }`}
    >
      <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={2.6} />
      {amount > 0 && <span>{amount}</span>}
    </span>
  );
};

export const LEAGUE_EMOJI = ['🌱', '🥉', '🥈', '🥇', '💎', '💠', '👑'];

const PODIUM = [
  { height: 'h-32', block: 'bg-podium-gold', ring: 'ring-amber/50', badge: 'bg-amber text-amber-dark', label: '1', avatar: 'lg' as const, order: 'order-2' },
  { height: 'h-24', block: 'bg-podium-silver', ring: 'ring-muted-foreground/30', badge: 'bg-muted text-foreground', label: '2', avatar: 'md' as const, order: 'order-1' },
  { height: 'h-20', block: 'bg-podium-bronze', ring: 'ring-earth/40', badge: 'bg-earth text-primary-foreground', label: '3', avatar: 'md' as const, order: 'order-3' },
];

interface LeaderboardTarget {
  /** Classement par catégorie d'espèces (ou 'all' pour le général). */
  category?: string;
  /** Classement par territoire (département). */
  territory?: { code: string; label: string };
  /** Affiche le classement directement, sans carte résumé ni bottom sheet. */
  inline?: boolean;
  /** Période : semaine en cours (défaut) ou depuis toujours. */
  period?: 'week' | 'all';
  /** Force le périmètre (masque le sélecteur Global / Mes abonnements). */
  scope?: 'global' | 'follows';
  /** Masque la pastille « Réinitialisation » quand l'appelant l'affiche déjà dans son en-tête. */
  showResetBadge?: boolean;
  /** Mesure : nombre de captures (défaut) ou XP gagnée (général uniquement). */
  metric?: 'captures' | 'xp' | 'league';
}


/** Cache mémoire des classements déjà chargés : en revenant sur un onglet on
 *  réaffiche instantanément la dernière liste connue, rafraîchie en arrière-plan. */
const boardCache = new Map<string, { rows: Row[]; mine: MyRank | null }>();

const CategoryLeaderboard = ({ category, territory, inline, period = 'week', scope: forcedScope, showResetBadge = true, metric = 'captures' }: LeaderboardTarget) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = useSubscription(user?.id);
  const isTerritory = !!territory;
  const value = isTerritory ? territory.code : (category || 'all');
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState<MyRank | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [innerScope, setInnerScope] = useState<'global' | 'follows'>('global');
  const [lockedTab, setLockedTab] = useState(false);
  const scope = forcedScope ?? innerScope;
  const setScope = setInnerScope;

  const closeSheet = useCallback(() => setOpen(false), []);
  const swipeClose = useSwipeDownClose(closeSheet);

  const userIds = useMemo(() => rows.map(r => r.user_id), [rows]);
  const premiumIds = usePremiumUsers(userIds);


  // Le classement "Mes abonnements" est réservé aux Premium.
  useEffect(() => {
    if (premiumLoading) return;
    if (scope === 'follows' && !isPremium) {
      if (!forcedScope) setInnerScope('global');
      setLockedTab(true);
    } else {
      setLockedTab(false);
    }
  }, [isPremium, premiumLoading, scope, forcedScope]);

  const isLeague = metric === 'league' && !isTerritory;
  const useXp = (metric === 'xp' || isLeague) && !isTerritory;
  const cacheKey = `${isTerritory ? 'terr' : isLeague ? 'league' : useXp ? 'xp' : 'cat'}:${value}:${scope}:${period}`;
  const [league, setLeague] = useState<LeagueInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = boardCache.get(cacheKey);
    if (cached) {
      setRows(cached.rows);
      setMine(cached.mine);
      setReady(true);
    } else {
      setReady(false);
    }
    const load = async () => {
      if (isLeague) {
        const { data } = await supabase.rpc('league_board');
        const list = (data as unknown as Array<{ rank: number; user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; points: number; captures: number; is_me: boolean; tier: number; group_size: number }> | null) || [];
        const nextRows: Row[] = list.map(r => ({ rank: Number(r.rank), user_id: r.user_id, display_name: r.display_name, username: r.username, avatar_url: r.avatar_url, captures: Number(r.points), captureCount: Number(r.captures), is_me: r.is_me, rank_change: null }));
        if (cancelled) return;
        setLeague(list[0] ? { tier: Number(list[0].tier), size: Number(list[0].group_size) } : null);
        setRows(nextRows); setMine(null); setReady(true);
        return;
      }
      if (useXp) {
        const { data } = await supabase.rpc('xp_leaderboard_v2', { p_limit: 20, p_scope: scope, p_period: period });
        const all = ((data as unknown as Array<Row & { xp: number; captures: number; total_players: number }> | null) || []).map(r => ({ ...r, rank: Number(r.rank), captures: Number(r.xp), captureCount: Number(r.captures), rank_change: null }));
        const meRow = all.find(r => r.is_me);
        const nextRows = all.filter(r => r.rank <= 20).slice(0, 20);
        const nextMine = meRow ? { rank: meRow.rank, captures: meRow.captures, captureCount: meRow.captureCount, total_players: Number(meRow.total_players), rank_change: null } : null;
        boardCache.set(cacheKey, { rows: nextRows, mine: nextMine });
        if (cancelled) return;
        setRows(nextRows); setMine(nextMine); setReady(true);
        return;
      }
      const [top, me] = isTerritory
        ? await Promise.all([
            supabase.rpc('territory_leaderboard', { p_department: value, p_limit: 20, p_scope: scope } as never),
            supabase.rpc('my_territory_rank', { p_department: value, p_scope: scope } as never),
          ])
        : await Promise.all([
            supabase.rpc('category_leaderboard_with_movement', { p_category: value, p_limit: 20, p_scope: scope, p_period: period }),
            supabase.rpc('my_category_rank_with_movement', { p_category: value, p_scope: scope, p_period: period }),
          ]);
      const nextRows = ((top.data as unknown as Row[] | null) || []).map(r => ({ ...r, rank: Number(r.rank), captures: Number(r.captures), rank_change: r.rank_change === null || r.rank_change === undefined ? null : Number(r.rank_change) }));
      const m = ((me.data as unknown as MyRank[] | null) || [])[0];
      const nextMine = m ? { rank: Number(m.rank), captures: Number(m.captures), total_players: Number(m.total_players), rank_change: m.rank_change === null || m.rank_change === undefined ? null : Number(m.rank_change) } : null;
      boardCache.set(cacheKey, { rows: nextRows, mine: nextMine });
      if (cancelled) return;
      setRows(nextRows);
      setMine(nextMine);
      setReady(true);
    };
    load();
    return () => { cancelled = true; };
  }, [isTerritory, value, scope, period, cacheKey, useXp, isLeague]);

if (!inline && rows.length === 0 && scope === 'global' && !open) return null;


  const podium = rows.slice(0, 3);
  const podiumOrdered = [podium[1], podium[0], podium[2]].filter(Boolean);
  const rest = rows.slice(3);

  const content = (
    <>
      {period === 'week' && showResetBadge && (
        <div className={`mt-1 ${inline ? 'px-1' : 'px-5'}`}>
          <LeaderboardResetBadge />
        </div>
      )}


{!forcedScope && (
<div className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {([['global', t('social.leaderboard.tabGlobal')], ['follows', t('social.leaderboard.tabFollows')]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  if (key === 'follows' && !isPremium) {
                    setLockedTab(true);
                    return;
                  }
                  setLockedTab(false);
                  setScope(key);
                }}
                className={`rounded-xl py-1.5 text-[12px] font-display font-bold transition-colors flex items-center justify-center gap-1 ${
                  (lockedTab ? key === 'follows' : scope === key) ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {label}
                {key === 'follows' && !isPremium && <Lock className="w-3 h-3" />}
              </button>
            ))}
          </div>
          )}


          {lockedTab ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-b from-amber/25 to-amber/5 border border-amber/30 flex items-center justify-center mb-3">
                <Crown className="w-6 h-6 text-amber" />
              </div>
              <p className="text-[14px] font-display font-bold text-foreground">{t('social.leaderboard.lockedTitle')}</p>
              <p className="mt-1 text-[12px] font-display text-muted-foreground leading-relaxed">
                {t('social.leaderboard.lockedDesc')}
              </p>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/premium');
                }}
                className="mt-4 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-[13px] font-display font-bold shadow-lg active:scale-[0.98] transition-transform"
              >
                {t('social.leaderboard.lockedCta')}
              </button>
            </div>
          ) : rows.length === 0 && isLeague && ready ? (
            <div className="px-6 py-8 text-center">
              <LeagueHeader tier={0} size={0} />
              <p className="mt-6 text-[15px] font-display font-bold text-foreground">{t('social.leaderboard.league.joinTitle')}</p>
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] font-display text-muted-foreground">
              {ready
                ? scope === 'follows'
                  ? t('social.leaderboard.emptyFollows')
                  : t('social.leaderboard.emptyGlobal')
                : t('social.common.loading')}
            </p>
) : (
            <>
            {isLeague && league && <LeagueHeader tier={league.tier} size={league.size} />}
            {/* Podium */}
            <div className="mx-4 mt-4 mb-5 p-1">
              <div className="flex items-end justify-center gap-3">
                {podiumOrdered.map((r) => {
                  const cfg = PODIUM[r.rank === 1 ? 0 : r.rank === 2 ? 1 : 2] ?? PODIUM[2];
                  const isFirst = r === podium[0];
                  return (
                    <div key={r.user_id} className="flex-1 flex flex-col items-center gap-1.5 max-w-[33%]">
                      <button
                        type="button"
                        onClick={() => { if (!r.is_me) navigate(`/explorer/${r.user_id}/collection`); }}
                        aria-disabled={r.is_me}
                        className={`flex flex-col items-center gap-1.5 w-full ${r.is_me ? 'cursor-default' : 'active:scale-95 transition-transform'}`}
                      >
                      {isFirst && <Crown className="w-5 h-5 text-amber" />}
                      <div className="relative">
                        <Avatar
                          row={r}
                          size={cfg.avatar}
                          className={`ring-4 ${cfg.ring}`}
                        />
                      <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${cfg.badge} flex items-center justify-center text-[10px] font-display font-bold shadow-sm`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className={`text-[11px] font-display font-bold truncate max-w-full ${r.is_me ? 'text-primary' : 'text-foreground'}`}>
                      {r.is_me ? t('social.leaderboard.you') : r.display_name || r.username || t('social.leaderboard.defaultName')}
                    </p>
                    <RankMovement change={r.rank_change} compact />
                                          </button>
                    <div className={`w-full ${cfg.height} ${cfg.block} rounded-2xl flex flex-col items-center justify-start gap-1.5 pt-2.5`}>
                      <span className="font-display font-black italic text-2xl leading-none text-foreground">{cfg.label}</span>
                      <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-display font-bold text-foreground">{t(useXp ? 'social.leaderboard.xpShort' : 'social.leaderboard.capturesShort', { count: r.captures })}</span>
                      {useXp && r.captureCount !== undefined && <span className="text-[10px] font-display font-semibold text-foreground/70">{t('social.leaderboard.capturesShort', { count: r.captureCount })}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          <ul className="divide-y divide-border">
            {rest.map((r, i) => {
              const zone = isLeague && league ? leagueZone(r.rank, r.captures, league.tier, league.size) : null;
              const prevZone = isLeague && league && i > 0 ? leagueZone(rest[i - 1].rank, rest[i - 1].captures, league.tier, league.size) : null;
              const showDownLabel = zone === 'down' && prevZone !== 'down';
              const showUpEnd = isLeague && league && i > 0 && prevZone === 'up' && zone !== 'up';
              return (
              <Fragment key={r.user_id}>
              {showUpEnd && (
                <li className="flex items-center justify-center gap-2 py-3 text-[13px] font-display font-extrabold uppercase tracking-wide text-primary"><ArrowUp className="h-4 w-4" strokeWidth={3} />{t('social.leaderboard.league.promoLine')}<ArrowUp className="h-4 w-4" strokeWidth={3} /></li>
              )}
              {showDownLabel && (
                <li className="flex items-center justify-center gap-2 py-3 text-[13px] font-display font-extrabold uppercase tracking-wide text-destructive"><ArrowDown className="h-4 w-4" strokeWidth={3} />{t('social.leaderboard.league.demoteLine')}<ArrowDown className="h-4 w-4" strokeWidth={3} /></li>
              )}
              <li className={`${r.is_me ? 'bg-primary/5' : ''} ${zone === 'up' ? 'border-l-[3px] border-l-primary' : zone === 'down' ? 'border-l-[3px] border-l-destructive' : ''}`}>
                <button
                  type="button"
                  onClick={() => { if (!r.is_me) navigate(`/explorer/${r.user_id}/collection`); }}
                  aria-disabled={r.is_me}
                  className={`flex w-full items-center gap-3 px-5 py-2.5 text-left ${r.is_me ? 'bg-primary/5 cursor-default' : 'active:opacity-60 transition-opacity'}`}
                >
                <span className={`w-6 text-center text-[13px] font-display font-bold ${r.is_me ? 'text-primary' : 'text-muted-foreground'}`}>
                  {r.rank}
                </span>
                <Avatar row={r} isPremium={premiumIds.has(r.user_id)} size="md" />
                <p className={`flex-1 min-w-0 truncate text-[13px] font-display ${r.is_me ? 'font-bold text-primary' : 'text-foreground'}`}>
                  {r.is_me ? t('social.leaderboard.you') : r.display_name || r.username || t('social.leaderboard.defaultName')}
                </p>
                <RankMovement change={r.rank_change} />
                <span className="flex shrink-0 flex-col items-end leading-tight">
                  <span className="text-[13px] font-display font-bold text-foreground">{useXp ? t('social.leaderboard.xpShort', { count: r.captures }) : r.captures}</span>
                  {useXp && r.captureCount !== undefined && <span className="text-[10px] font-display text-muted-foreground">{t('social.leaderboard.capturesShort', { count: r.captureCount })}</span>}
                </span>
                </button>
              </li>
              </Fragment>
              );
            })}
            {/* L'utilisateur absent du top visible est ajouté à la fin de la liste. */}
            {mine && !rows.some(r => r.is_me) && (
              <li className="bg-primary/5">
                <div className="flex w-full items-center gap-3 px-5 py-2.5 text-left cursor-default">
                  <span className="w-6 text-center text-[13px] font-display font-bold text-primary">{mine.rank}</span>
                  <div
                    style={avatarFallbackStyle(user?.email)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-bold"
                  >
                    {(user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <p className="flex-1 min-w-0 truncate text-[13px] font-display font-bold text-primary">{t('social.leaderboard.you')}</p>
                  <RankMovement change={mine.rank_change} />
                  <span className="flex shrink-0 flex-col items-end leading-tight">
                    <span className="text-[13px] font-display font-bold text-foreground">{useXp ? t('social.leaderboard.xpShort', { count: mine.captures }) : mine.captures}</span>
                    {useXp && mine.captureCount !== undefined && <span className="text-[10px] font-display text-muted-foreground">{t('social.leaderboard.capturesShort', { count: mine.captureCount })}</span>}
                  </span>
                </div>
              </li>
            )}
          </ul>
          </>
          )}
    </>
  );

  if (inline) {
    return <div className="pb-2">{content}</div>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-3 flex items-center justify-between gap-3 rounded-2xl bg-card border border-border px-3 py-2.5 shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-display font-bold ring-4 ring-primary/10">
            {mine ? `${mine.rank}${mine.rank === 1 ? 'er' : 'e'}` : '—'}
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-bold">{!isTerritory && category === 'all' ? t('social.leaderboard.generalRanking') : isTerritory ? t('social.leaderboard.ranking') : t(`bestiary.categoryNames.${category}`, { defaultValue: category })}</p>
            <p className="text-[13px] font-display font-bold text-foreground truncate">
              {mine
                ? t(period === 'all' ? 'social.leaderboard.capturesAllTime' : 'social.leaderboard.capturesThisWeek', { count: mine.captures })
                : t(period === 'all' ? 'social.leaderboard.noCapturesAllTime' : 'social.leaderboard.noCapturesThisWeek')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex -space-x-2">
            {podium.map((r) => (
              <Avatar key={r.user_id} row={r} className="border-2 border-card" />
            ))}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          ref={swipeClose.ref}
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-3xl px-0"
          style={swipeClose.style}
        >
          <SheetHeader className="px-5 text-left">
            <SheetTitle className="font-display text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber" />
              {isTerritory ? t('social.leaderboard.sheetTitleTerritory', { label: territory.label }) : category === 'all' ? t('social.leaderboard.sheetTitleGeneral') : t(period === 'all' ? 'social.leaderboard.sheetTitleCategoryAll' : 'social.leaderboard.sheetTitleCategory', { category: t(`bestiary.categoryNames.${category}`, { defaultValue: category }) })}
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CategoryLeaderboard;
