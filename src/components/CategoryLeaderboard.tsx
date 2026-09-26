import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDown, ArrowUp, ChevronRight, Clock, Crown, Lock, Minus, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { avatarFallbackStyle } from '@/lib/avatarPalette';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useSwipeDownClose } from '@/lib/useSwipeDownClose';

interface Row {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  captures: number;
  is_me: boolean;
  rank_change?: number | null;
}

interface MyRank {
  rank: number;
  captures: number;
  total_players: number;
  rank_change?: number | null;
}

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
export const LeaderboardResetBadge = ({ className = '' }: { className?: string }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(msUntilReset);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(msUntilReset()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber/5 border border-amber/15 ${className}`}>
      <div className="relative flex items-center justify-center">
        <Clock className="w-4 h-4 text-muted-foreground animate-[spin_4s_linear_infinite]" />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber/60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber" />
        </span>
      </div>
      <p className="text-[12px] font-display text-muted-foreground tracking-tight leading-none">
        {t('social.leaderboard.resetIn')}<span className="text-foreground font-bold">{formatTimeLeft(timeLeft, t)}</span>
      </p>
    </div>
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

const PODIUM = [
  { height: 'h-16', ring: 'ring-amber/50', badge: 'bg-amber text-amber-dark', label: '1', avatar: 'lg' as const, order: 'order-2' },
  { height: 'h-11', ring: 'ring-muted-foreground/30', badge: 'bg-muted text-foreground', label: '2', avatar: 'md' as const, order: 'order-1' },
  { height: 'h-8', ring: 'ring-earth/40', badge: 'bg-earth text-primary-foreground', label: '3', avatar: 'md' as const, order: 'order-3' },
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
}


/** Cache mémoire des classements déjà chargés : en revenant sur un onglet on
 *  réaffiche instantanément la dernière liste connue, rafraîchie en arrière-plan. */
const boardCache = new Map<string, { rows: Row[]; mine: MyRank | null }>();

const CategoryLeaderboard = ({ category, territory, inline, period = 'week', scope: forcedScope, showResetBadge = true }: LeaderboardTarget) => {
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

  const cacheKey = `${isTerritory ? 'terr' : 'cat'}:${value}:${scope}:${period}`;

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
  }, [isTerritory, value, scope, period, cacheKey]);

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
            {/* Podium */}
            <div className="mx-4 mt-4 mb-5 rounded-3xl bg-gradient-to-b from-amber/10 via-card to-card border border-border p-4">
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
                    <p className="text-[10px] font-display text-muted-foreground">{t('social.leaderboard.capturesShort', { count: r.captures })}</p>
                      </button>
                    <div className={`w-full ${cfg.height} rounded-t-xl bg-gradient-to-t from-primary/15 to-primary/40 border-x border-t border-border`} />
                  </div>
                );
              })}
            </div>
          </div>


          <ul className="divide-y divide-border">
            {rest.map((r) => (
              <li key={r.user_id} className={r.is_me ? 'bg-primary/5' : ''}>
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
                <span className="text-[13px] font-display font-bold text-foreground shrink-0">{r.captures}</span>
                </button>
              </li>
            ))}
            {mine && !rows.some(r => r.is_me) && (
              <li className="flex items-center gap-3 px-5 py-2.5 bg-primary/5">
                <span className="w-6 text-center text-[13px] font-display font-bold text-primary">{mine.rank}</span>
                <div
                  style={avatarFallbackStyle(user?.email)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-bold"
                >
                  {(user?.email || '?').charAt(0).toUpperCase()}
                </div>
                <p className="flex-1 min-w-0 truncate text-[13px] font-display font-bold text-primary">{t('social.leaderboard.you')}</p>
                <RankMovement change={mine.rank_change} />
                <span className="text-[13px] font-display font-bold text-foreground shrink-0">{mine.captures}</span>
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
