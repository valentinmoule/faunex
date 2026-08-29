import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Crown, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import { usePremiumUsers } from '@/hooks/usePremiumUsers';
import { useSwipeDownClose } from '@/lib/useSwipeDownClose';

interface Row {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  captures: number;
  is_me: boolean;
}

interface MyRank {
  rank: number;
  captures: number;
  total_players: number;
}

/** Milliseconds until next Sunday 00:00 (week runs Sunday → Sunday). */
const msUntilReset = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()), 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
};

const formatTimeLeft = (ms: number) => {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
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

const PODIUM = [
  { height: 'h-16', ring: 'ring-amber/50', badge: 'bg-amber text-amber-dark', label: '1', avatar: 'lg' as const, order: 'order-2' },
  { height: 'h-11', ring: 'ring-muted-foreground/30', badge: 'bg-muted text-foreground', label: '2', avatar: 'md' as const, order: 'order-1' },
  { height: 'h-8', ring: 'ring-earth/40', badge: 'bg-earth text-primary-foreground', label: '3', avatar: 'md' as const, order: 'order-3' },
];

const CategoryLeaderboard = ({ category }: { category: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState<MyRank | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'global' | 'follows'>('global');

const closeSheet = useCallback(() => setOpen(false), []);
  const swipeClose = useSwipeDownClose(closeSheet);

  const [timeLeft, setTimeLeft] = useState(msUntilReset);

  const userIds = useMemo(() => rows.map(r => r.user_id), [rows]);
  const premiumIds = usePremiumUsers(userIds);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(msUntilReset()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const load = async () => {
      const [top, me] = await Promise.all([
        supabase.rpc('category_leaderboard', { p_category: category, p_limit: 20, p_scope: scope } as never),
        supabase.rpc('my_category_rank', { p_category: category, p_scope: scope } as never),
      ]);
      if (cancelled) return;
      setRows(((top.data as unknown as Row[] | null) || []).map(r => ({ ...r, rank: Number(r.rank), captures: Number(r.captures) })));
      const m = ((me.data as unknown as MyRank[] | null) || [])[0];
      setMine(m ? { rank: Number(m.rank), captures: Number(m.captures), total_players: Number(m.total_players) } : null);
      setReady(true);
    };
    load();
    return () => { cancelled = true; };
  }, [category, scope]);

  if (rows.length === 0 && scope === 'global' && !open) return null;



const podium = rows.slice(0, 3);
  const podiumOrdered = [podium[1], podium[0], podium[2]].filter(Boolean);
  const rest = rows.slice(3);

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
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-bold">{category === 'all' ? 'Classement général' : 'Classement'}</p>
            <p className="text-[13px] font-display font-bold text-foreground truncate">
              {mine ? `${mine.captures} capture${mine.captures > 1 ? 's' : ''} cette semaine` : 'Aucune capture cette semaine'}
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
              {category === 'all' ? 'Classement général · Semaine' : `Top ${category} · Semaine`}
            </SheetTitle>
          </SheetHeader>
<p className="px-5 text-[12px] font-display text-muted-foreground">
            Réinitialisation dans {formatTimeLeft(timeLeft)}
          </p>

          <div className="mx-4 mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {([['global', 'Global'], ['follows', 'Mes abonnements']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={`rounded-xl py-1.5 text-[12px] font-display font-bold transition-colors ${
                  scope === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] font-display text-muted-foreground">
              {ready
                ? scope === 'follows'
                  ? 'Aucune capture cette semaine parmi les explorateurs que tu suis.'
                  : 'Aucune capture cette semaine.'
                : 'Chargement…'}
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
                      {r.is_me ? 'Toi' : r.display_name || r.username || 'Explorateur'}
                    </p>
                    <p className="text-[10px] font-display text-muted-foreground">{r.captures} capt.</p>
                    <div className={`w-full ${cfg.height} rounded-t-xl bg-gradient-to-t from-primary/15 to-primary/40 border-x border-t border-border`} />
                  </div>
                );
              })}
            </div>
          </div>


          <ul className="divide-y divide-border">
            {rest.map((r) => (
              <li key={r.user_id} className={`flex items-center gap-3 px-5 py-2.5 ${r.is_me ? 'bg-primary/5' : ''}`}>
                <span className={`w-6 text-center text-[13px] font-display font-bold ${r.is_me ? 'text-primary' : 'text-muted-foreground'}`}>
                  {r.rank}
                </span>
                <Avatar row={r} isPremium={premiumIds.has(r.user_id)} size="md" />
                <p className={`flex-1 min-w-0 truncate text-[13px] font-display ${r.is_me ? 'font-bold text-primary' : 'text-foreground'}`}>
                  {r.is_me ? 'Toi' : r.display_name || r.username || 'Explorateur'}
                </p>
                <span className="text-[13px] font-display font-bold text-foreground shrink-0">{r.captures}</span>
              </li>
            ))}
            {mine && !rows.some(r => r.is_me) && (
              <li className="flex items-center gap-3 px-5 py-2.5 bg-primary/5">
                <span className="w-6 text-center text-[13px] font-display font-bold text-primary">{mine.rank}</span>
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-display font-bold text-primary">T</div>
                <p className="flex-1 min-w-0 truncate text-[13px] font-display font-bold text-primary">Toi</p>
                <span className="text-[13px] font-display font-bold text-foreground shrink-0">{mine.captures}</span>
              </li>
            )}
          </ul>
          </>
          )}

        </SheetContent>
      </Sheet>
    </>
  );
};

export default CategoryLeaderboard;
