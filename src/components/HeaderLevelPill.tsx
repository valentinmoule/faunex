import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Pastille compacte « Niv. N » avec anneau de progression XP, affichée dans les en-têtes. */
export default function HeaderLevelPill() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const uid = session?.user?.id;
  const { data } = useQuery({
    queryKey: ['header-level', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('level, xp, xp_to_next').eq('user_id', uid!).maybeSingle();
      return data;
    },
  });
  if (!data) return null;
  const level = data.level ?? 1;
  const xp = data.xp ?? 0;
  const next = Math.max(1, data.xp_to_next ?? 1);
  const pct = Math.min(1, xp / next);
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2" aria-label={t('header.levelAria', { level, xp, next })}>
      <div className="relative h-9 w-9 shrink-0">
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
          <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[12px] font-display font-extrabold text-foreground">{level}</span>
      </div>
      <div className="leading-tight">
        <p className="text-[11px] font-display font-bold uppercase tracking-wide text-muted-foreground">{t('header.level', { level })}</p>
        <p className="text-[12px] font-display font-extrabold tabular-nums text-foreground">{xp}<span className="text-muted-foreground font-bold">/{next} XP</span></p>
      </div>
    </div>
  );
}
