import { memo, useEffect, useState } from 'react';
import { Trophy, Sparkles, Rocket, Sprout } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SpeciesProgress {
  species_count: number;
  rank: number;
  total_players: number;
  top_percent: number;
}

/**
 * Chip gamifié affiché à côté du compteur « X espèces » dans Mon Faunex.
 * Positionne l'utilisateur parmi tous les explorateurs (Top X %) avec un
 * style dégradé selon le palier atteint. Rien n'est affiché sans capture.
 */
const SpeciesProgressChip = memo(function SpeciesProgressChip({ refreshKey }: { refreshKey?: number }) {
  const [progress, setProgress] = useState<SpeciesProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('my_species_progress');
      if (cancelled || error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && Number(row.species_count) > 0) {
        setProgress({
          species_count: Number(row.species_count),
          rank: Number(row.rank),
          total_players: Number(row.total_players),
          top_percent: Number(row.top_percent),
        });
      } else {
        setProgress(null);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!progress || progress.total_players === 0) return null;

  const { top_percent: top, rank } = progress;

  // Paliers gamifiés : couleur + icône selon la position de l'utilisateur.
  let icon = <Sprout className="w-3.5 h-3.5" />;
  let cls = 'bg-muted/80 text-muted-foreground border-border';
  let glow = false;
  let label: string;

  if (top <= 1) {
    icon = <Trophy className="w-3.5 h-3.5" />;
    cls = 'bg-amber-100 text-amber-700 border-amber-300';
    glow = true;
  } else if (top <= 5) {
    icon = <Trophy className="w-3.5 h-3.5" />;
    cls = 'bg-violet-100 text-violet-700 border-violet-300';
  } else if (top <= 10) {
    icon = <Sparkles className="w-3.5 h-3.5" />;
    cls = 'bg-blue-100 text-blue-700 border-blue-300';
  } else if (top <= 25) {
    icon = <Rocket className="w-3.5 h-3.5" />;
    cls = 'bg-emerald-100 text-emerald-700 border-emerald-300';
  }

  if (top <= 25) {
    label = `Top ${top} %`;
  } else if (rank > 0) {
    // Milieu de classement : on met en avant le rang absolu, plus motivant.
    label = `#${rank}`;
  } else {
    return null;
  }

  return (
    <span
      title={rank > 0 ? `Tu es ${rank}ᵉ sur ${progress.total_players} explorateurs` : undefined}
      className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-display font-bold leading-none ${cls}`}
    >
      {glow && (
        <span className="absolute inset-0 rounded-full bg-amber-300/40 animate-ping [animation-duration:2.2s] pointer-events-none" aria-hidden />
      )}
      <span className="relative flex items-center gap-1">
        {icon}
        {label}
      </span>
    </span>
  );
});

export default SpeciesProgressChip;
