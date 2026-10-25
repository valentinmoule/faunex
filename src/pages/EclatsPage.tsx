import { useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
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
  return <main className="min-h-screen bg-background pb-24">
    <PageHeader sticky className="border-b border-border bg-background px-5 pb-4">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.back')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-display text-2xl font-bold">{t('economy.title')}</h1>
        <Button variant="ghost" size="icon" className="ml-auto" disabled={refreshing} aria-label={t('economy.refresh')} onClick={async () => { setRefreshing(true); try { await wallet.refetch(); } finally { setRefreshing(false); } }}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></Button>
      </div>
    </PageHeader>
    <div className="mx-auto max-w-lg px-5">
      <section className="py-14 text-center">
        <SeedIcon className="mx-auto mb-5 h-20 w-20" glow />
        <p className="font-display text-5xl font-bold tabular-nums">{wallet.isPending ? '—' : wallet.data?.balance.toLocaleString(i18n.language) ?? '—'}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t('economy.available')}</p>
        {Number(wallet.data?.debt ?? 0) > 0 && <p className="mt-3 text-sm text-muted-foreground">{t('economy.debt', { amount: wallet.data?.debt })}</p>}
        {wallet.isError && <p className="mt-8 text-sm text-destructive">{t('economy.error')}</p>}
      </section>
    </div>
  </main>;
}
