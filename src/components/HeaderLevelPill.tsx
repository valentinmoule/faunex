import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { XP_CHANGED } from '@/lib/xpEvents';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileButton } from '@/components/ProfileDrawer';

/** Avatar entouré de l'anneau de progression XP, badge de niveau incrusté, XP à côté. */
export default function HeaderLevelPill() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const uid = session?.user?.id;
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['header-level'] });
    window.addEventListener(XP_CHANGED, refresh);
    return () => window.removeEventListener(XP_CHANGED, refresh);
  }, [queryClient]);
  const { data } = useQuery({
    queryKey: ['header-level', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('level, xp, xp_to_next').eq('user_id', uid!).maybeSingle();
      return data;
    },
  });
  if (!data) return <ProfileButton className="-ml-0.5" />;
  const level = data.level ?? 1;
  const xp = data.xp ?? 0;
  const next = Math.max(1, data.xp_to_next ?? 1);
  const pct = Math.min(1, xp / next);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 48 48" aria-hidden className="pointer-events-none absolute inset-0 h-12 w-12 -rotate-90">
          <circle cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
          <circle cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><ProfileButton /></div>
        <span aria-hidden className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-display font-extrabold leading-none text-primary-foreground">{level}</span>
      </div>
      <div className="leading-tight" aria-label={t('header.levelAria', { level, xp, next })}>
        <p className="text-[11px] font-display font-bold uppercase tracking-wide text-muted-foreground">{t('header.level', { level })}</p>
        <p className="text-[12px] font-display font-extrabold tabular-nums text-foreground">{xp}<span className="text-muted-foreground font-bold">/{next} XP</span></p>
      </div>
    </div>
  );
}
