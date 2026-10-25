import { useState } from 'react';
import { ArrowLeft, RefreshCw, Sparkles, Sprout } from 'lucide-react';
import SeedIcon from '@/components/SeedIcon';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/hooks/useWallet';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';

export default function EclatsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const wallet = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  return <main className="flex min-h-screen flex-col bg-background">
    <PageHeader sticky className="border-b border-border bg-background px-5 pb-4">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-display text-2xl font-bold">{t('economy.title')}</h1>
        <Button variant="ghost" size="icon" className="ml-auto" disabled={refreshing} aria-label={t('economy.refresh')} onClick={async () => { setRefreshing(true); try { await wallet.refetch(); } finally { setRefreshing(false); } }}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></Button>
      </div>
    </PageHeader>
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5">
      <section className="py-12 text-center">
        <SeedIcon className="seed-float mx-auto mb-5 h-20 w-20" glow />
        <p className="font-display text-5xl font-bold tabular-nums">{wallet.isPending ? '—' : wallet.data?.balance.toLocaleString(i18n.language) ?? '—'}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t('economy.available')}</p>
        <button type="button" className="game-button mx-auto mt-8 flex items-center gap-2 px-6 py-3 text-base" onClick={() => navigate('/apprendre')}>
          <Sprout className="h-5 w-5" />
          {t('learning.title')}
        </button>
        {Number(wallet.data?.debt ?? 0) > 0 && <p className="mt-3 text-sm text-muted-foreground">{t('economy.debt', { amount: wallet.data?.debt })}</p>}
        {wallet.isError && <p className="mt-8 text-sm text-destructive">{t('economy.error')}</p>}
      </section>
      <section className="pb-14 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h2 className="font-display text-xl font-bold">{t('economy.upcoming.title')}</h2>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">{t('economy.upcoming.badge')}</span>
        </div>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{t('economy.upcoming.teaser')}</p>
        <p className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 text-sm font-medium text-primary"><Sparkles className="h-4 w-4 shrink-0" aria-hidden />{t('economy.upcoming.more')}</p>
      </section>
    </div>
  </main>;
}
