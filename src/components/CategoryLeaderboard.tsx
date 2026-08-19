import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Row {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  species: number;
  is_me: boolean;
}

interface MyRank {
  rank: number;
  species: number;
  total_players: number;
}

const podiumRing = ['ring-amber-400', 'ring-muted-foreground/40', 'ring-orange-400'];

const Avatar = ({ row, size = 'w-6 h-6', className = '' }: { row: Row; size?: string; className?: string }) => {
  const initial = (row.display_name || row.username || '?').charAt(0).toUpperCase();
  return row.avatar_url ? (
    <img src={row.avatar_url} alt="" loading="lazy" className={`${size} rounded-full object-cover ${className}`} />
  ) : (
    <div className={`${size} rounded-full bg-muted flex items-center justify-center text-[10px] font-display font-bold text-muted-foreground ${className}`}>
      {initial}
    </div>
  );
};

const CategoryLeaderboard = ({ category }: { category: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState<MyRank | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    const load = async () => {
      const [top, me] = await Promise.all([
        supabase.rpc('category_leaderboard', { p_category: category, p_limit: 20 }),
        supabase.rpc('my_category_rank', { p_category: category }),
      ]);
      if (cancelled) return;
      setRows(((top.data as Row[] | null) || []).map(r => ({ ...r, rank: Number(r.rank), species: Number(r.species) })));
      const m = ((me.data as MyRank[] | null) || [])[0];
      setMine(m ? { rank: Number(m.rank), species: Number(m.species), total_players: Number(m.total_players) } : null);
      setReady(true);
    };
    load();
    return () => { cancelled = true; };
  }, [category]);

  if (!ready || rows.length === 0) return null;

  const podium = rows.slice(0, 3);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-3 flex items-center justify-between gap-3 rounded-2xl bg-card border border-border px-3 py-2.5 shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-display font-bold ring-4 ring-primary/10">
            {mine ? `${mine.rank}${mine.rank === 1 ? 'er' : 'e'}` : '—'}
          </div>
          <div className="min-w-0 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-bold">Ma position</p>
            <p className="text-[13px] font-display font-bold text-foreground truncate">
              {mine ? `${mine.species} espèce${mine.species > 1 ? 's' : ''} · ${mine.total_players} explorateurs` : `${rows.length} explorateurs`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex -space-x-2">
            {podium.map((r, i) => (
              <Avatar key={r.user_id} row={r} className={`ring-2 ${podiumRing[i]} border-2 border-card`} />
            ))}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl px-0">
          <SheetHeader className="px-5 text-left">
            <SheetTitle className="font-display text-base">Classement · {category}</SheetTitle>
          </SheetHeader>
          <p className="px-5 text-[12px] font-display text-muted-foreground mb-2">
            Nombre d'espèces distinctes capturées dans cette catégorie
          </p>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.user_id} className={`flex items-center gap-3 px-5 py-2.5 ${r.is_me ? 'bg-primary/5' : ''}`}>
                <span className={`w-6 text-center text-[13px] font-display font-bold ${r.is_me ? 'text-primary' : 'text-muted-foreground'}`}>
                  {r.rank}
                </span>
                <Avatar row={r} size="w-8 h-8" />
                <p className={`flex-1 min-w-0 truncate text-[13px] font-display ${r.is_me ? 'font-bold text-primary' : 'text-foreground'}`}>
                  {r.is_me ? 'Toi' : r.display_name || r.username || 'Explorateur'}
                </p>
                <span className="text-[13px] font-display font-bold text-foreground shrink-0">{r.species}</span>
              </li>
            ))}
            {mine && !rows.some(r => r.is_me) && (
              <li className="flex items-center gap-3 px-5 py-2.5 bg-primary/5">
                <span className="w-6 text-center text-[13px] font-display font-bold text-primary">{mine.rank}</span>
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-display font-bold text-primary">T</div>
                <p className="flex-1 min-w-0 truncate text-[13px] font-display font-bold text-primary">Toi</p>
                <span className="text-[13px] font-display font-bold text-foreground shrink-0">{mine.species}</span>
              </li>
            )}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CategoryLeaderboard;
