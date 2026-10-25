import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Gem, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function EclatsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const wallet = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const history = useInfiniteQuery({
    queryKey: ['eclats-history', session?.user.id], enabled: Boolean(session), initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!session) return [];
      const { data, error } = await supabase.from('eclats_transactions').select('id,kind,amount,balance_delta,debt_delta,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(pageParam, pageParam + 19);
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, pages) => last.length === 20 ? pages.length * 20 : undefined,
  });
  const rows = history.data?.pages.flat() ?? [];
  return <main className="min-h-screen bg-background pb-24">
    <PageHeader sticky className="border-b border-border bg-background px-5 pb-4">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-display text-2xl font-bold">{t('economy.title')}</h1>
        <Button variant="ghost" size="icon" className="ml-auto" disabled={refreshing} aria-label={t('economy.refresh')} onClick={async () => { setRefreshing(true); try { await Promise.all([wallet.refetch(), history.refetch()]); } finally { setRefreshing(false); } }}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></Button>
      </div>
    </PageHeader>
    <div className="mx-auto max-w-lg px-5">
      <section className="py-8 text-center">
        <Gem className="mx-auto mb-3 h-10 w-10 text-primary" />
        <p className="font-display text-4xl font-bold tabular-nums">{wallet.isPending ? '—' : wallet.data?.balance.toLocaleString(i18n.language) ?? '—'}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('economy.available')}</p>
        {Number(wallet.data?.debt ?? 0) > 0 && <p className="mt-3 text-sm text-muted-foreground">{t('economy.debt', { amount: wallet.data?.debt })}</p>}
      </section>
      <h2 className="mb-3 font-display text-lg font-semibold">{t('economy.history')}</h2>
      {(history.isPending || wallet.isPending) && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />}
      {(history.isError || wallet.isError) && <p className="py-5 text-sm text-destructive">{t('economy.error')}</p>}
      {!history.isPending && !history.isError && rows.length === 0 && <p className="py-6 text-sm text-muted-foreground">{t('economy.empty')}</p>}
      <ul className="divide-y divide-border">{rows.map(row => <li key={row.id} className="flex items-center justify-between gap-4 py-4">
        <div><p className="text-sm font-semibold">{t(`economy.kinds.${row.kind}`, { defaultValue: t('economy.kinds.adjustment') })}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString(i18n.language)}</p>{row.debt_delta !== 0 && <p className="mt-1 text-xs text-muted-foreground">{t('economy.compensation', { amount: Math.abs(row.debt_delta) })}</p>}</div>
        <span className="shrink-0 font-display font-semibold tabular-nums text-primary">{row.balance_delta > 0 ? '+' : ''}{row.balance_delta.toLocaleString(i18n.language)}</span>
      </li>)}</ul>
      {history.hasNextPage && <Button variant="ghost" className="mt-3 w-full" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{t('economy.more')}</Button>}
    </div>
  </main>;
}