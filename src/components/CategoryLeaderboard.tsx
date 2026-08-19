import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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

const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);

const CategoryLeaderboard = ({ category }: { category: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [top, me] = await Promise.all([
        supabase.rpc('category_leaderboard', { p_category: category, p_limit: 20 }),
        supabase.rpc('my_category_rank', { p_category: category }),
      ]);
      if (cancelled) return;
      setRows(((top.data as Row[] | null) || []).map(r => ({ ...r, rank: Number(r.rank), species: Number(r.species) })));
      const m = ((me.data as MyRank[] | null) || [])[0];
      setMine(m ? { rank: Number(m.rank), species: Number(m.species), total_players: Number(m.total_players) } : null);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [category]);

  if (loading) {
    return (
      <div className="mb-4 rounded-2xl bg-card border border-border p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-[12px] font-display text-muted-foreground">Chargement du classement…</span>
      </div>
    );
  }

  if (rows.length === 0) return null;

  const visible = expanded ? rows : rows.slice(0, 5);
  const meInVisible = visible.some(r => r.is_me);

  return (
    <div className="mb-4 rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" strokeWidth={2} />
          <p className="text-[13px] font-display font-bold text-foreground">Classement · {category}</p>
        </div>
        {mine && (
          <span className="text-[11px] font-display font-bold text-primary">
            #{mine.rank}/{mine.total_players}
          </span>
        )}
      </div>

      <ul className="divide-y divide-border">
        {visible.map((r) => (
          <li
            key={r.user_id}
            className={`flex items-center gap-3 px-4 py-2.5 ${r.is_me ? 'bg-primary/5' : ''}`}
          >
            <span className="w-6 text-center text-[13px] font-display font-bold text-muted-foreground">
              {medal(r.rank) || r.rank}
            </span>
            {r.avatar_url ? (
              <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" loading="lazy" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-display font-bold text-muted-foreground">
                {(r.display_name || r.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <p className={`flex-1 min-w-0 truncate text-[13px] font-display ${r.is_me ? 'font-bold text-primary' : 'text-foreground'}`}>
              {r.is_me ? 'Toi' : r.display_name || r.username || 'Explorateur'}
            </p>
            <span className="text-[12px] font-display font-bold text-foreground shrink-0">{r.species}</span>
          </li>
        ))}
        {!meInVisible && mine && (
          <li className="flex items-center gap-3 px-4 py-2.5 bg-primary/5">
            <span className="w-6 text-center text-[13px] font-display font-bold text-primary">{mine.rank}</span>
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-display font-bold text-primary">T</div>
            <p className="flex-1 min-w-0 truncate text-[13px] font-display font-bold text-primary">Toi</p>
            <span className="text-[12px] font-display font-bold text-foreground shrink-0">{mine.species}</span>
          </li>
        )}
      </ul>

      {rows.length > 5 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1 py-2.5 text-[12px] font-display font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <>Réduire <ChevronUp className="w-3.5 h-3.5" /></> : <>Voir le top {rows.length} <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </div>
  );
};

export default CategoryLeaderboard;
