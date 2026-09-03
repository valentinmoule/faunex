import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Crown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import { PREMIUM_MONTHLY_PRICE_ID, PREMIUM_YEARLY_PRICE_ID } from '@/lib/paddle';
import { supabase } from '@/integrations/supabase/client';
import { IS_NATIVE_APP } from '@/lib/platform';
import { Browser } from '@capacitor/browser';
import { useTranslation } from 'react-i18next';
import { useAppLocale } from '@/hooks/useAppLocale';

interface FeatureRow {
  label: string;
  free: ReactNode;
  premium: ReactNode;
}

const useFeatures = (t: (key: string) => string): FeatureRow[] => [
  {
    label: t('profile.premium.features.identification'),
    free: <span className="text-sm font-medium">4</span>,
    premium: <span className="text-sm font-semibold text-primary">{t('profile.premium.features.unlimited')}</span>,
  },
  {
    label: t('profile.premium.features.zoneSearch'),
    free: <span className="text-sm font-medium">4</span>,
    premium: <span className="text-sm font-semibold text-primary">{t('profile.premium.features.unlimited')}</span>,
  },
  {
    label: t('profile.premium.features.collections'),
    free: <span className="text-sm font-medium">3</span>,
    premium: <span className="text-sm font-semibold text-primary">{t('profile.premium.features.unlimitedPlural')}</span>,
  },
  {
    label: t('profile.premium.features.premiumBadge'),
    free: <Minus className="h-4 w-4 text-muted-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
  {
    label: t('profile.premium.features.notesLocation'),
    free: <Check className="h-4 w-4 text-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
  {
    label: t('profile.premium.features.quests'),
    free: <Check className="h-4 w-4 text-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
  {
    label: t('profile.premium.features.leaderboard'),
    free: <Check className="h-4 w-4 text-foreground" />,
    premium: <Check className="h-4 w-4 text-primary" />,
  },
];

const usePlans = (t: (key: string) => string) => ({
  monthly: {
    priceId: PREMIUM_MONTHLY_PRICE_ID,
    label: t('profile.premium.plans.monthly.label'),
    price: '2,40 €',
    period: '/ mois',
    note: t('profile.premium.plans.monthly.note'),
    cta: t('profile.premium.plans.monthly.cta'),
  },
  yearly: {
    priceId: PREMIUM_YEARLY_PRICE_ID,
    label: t('profile.premium.plans.yearly.label'),
    price: '24 €',
    period: '/ an',
    note: t('profile.premium.plans.yearly.note'),
    cta: t('profile.premium.plans.yearly.cta'),
  },
} as const);

const PremiumPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t } = useTranslation();
  const { locale } = useAppLocale();
  const [params, setParams] = useSearchParams();
  const { isPremium, subscription, loading, refresh } = useSubscription(session?.user?.id);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const FEATURES = useFeatures(t);
  const PLANS = usePlans(t);
  const selected = PLANS[plan];

  useEffect(() => {
    if (params.get('checkout') === 'success') {
      toast.success(t('profile.premium.checkoutSuccess'));
      params.delete('checkout');
      setParams(params, { replace: true });
      const timer = setTimeout(refresh, 2500);
      return () => clearTimeout(timer);
    }
  }, [params, setParams, refresh]);

  // Ouverture automatique du paiement quand l'app native renvoie ici via le
  // navigateur système (`/premium?checkout=auto&plan=…&uid=…&email=…`).
  const autoCheckout = params.get('checkout') === 'auto';
  useEffect(() => {
    if (!autoCheckout || IS_NATIVE_APP) return;
    const wanted = params.get('plan') === 'monthly' ? 'monthly' : 'yearly';
    const uid = params.get('uid') || session?.user?.id;
    const email = params.get('email') || session?.user?.email || undefined;
    setPlan(wanted);
    params.delete('checkout');
    params.delete('plan');
    params.delete('email');
    params.delete('uid');
    setParams(params, { replace: true });
    if (!uid) {
      navigate('/auth');
      return;
    }
    openCheckout({
      priceId: wanted === 'monthly' ? PREMIUM_MONTHLY_PRICE_ID : PREMIUM_YEARLY_PRICE_ID,
      plan: wanted,
      customerEmail: email,
      customData: { userId: uid },
      successUrl: `${window.location.origin}/premium?checkout=success`,
    }).catch((e) => {
      console.error(e);
      toast.error(t('profile.premium.checkoutError'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckout]);

  const handleSubscribe = async () => {
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    try {
      await openCheckout({
        priceId: selected.priceId,
        plan,
        customerEmail: session.user.email ?? undefined,
        customData: { userId: session.user.id },
        successUrl: `${window.location.origin}/premium?checkout=success`,
      });
    } catch (e) {
      console.error(e);
      toast.error(t('profile.premium.checkoutError'));
    }
  };

  const handleManage = async () => {
    if (IS_NATIVE_APP) {
      // Dans l'app native, `window.open` n'ouvre rien d'utilisable : on passe
      // par le navigateur système.
      const { data, error } = await supabase.functions.invoke('paddle-portal');
      if (error || !data?.url) {
        toast.error(t('profile.premium.manageError'));
        return;
      }
      await Browser.open({ url: data.url as string });
      return;
    }
    // Ouvre l'onglet immédiatement (dans le geste utilisateur) pour éviter le blocage de popup
    const tab = window.open('', '_blank');
    const { data, error } = await supabase.functions.invoke('paddle-portal');
    if (error || !data?.url) {
      tab?.close();
      toast.error(t('profile.premium.manageError'));
      return;
    }
    if (tab) {
      tab.location.href = data.url as string;
    } else {
      window.location.href = data.url as string;
    }
  };


  return (
    <div className="min-h-screen bg-background pb-40">
      <PaymentTestModeBanner />
      <PageHeader className="px-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          aria-label={t('profile.premium.backAria')}
          className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </PageHeader>

      <main className="px-5 pt-2">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Crown className="h-3.5 w-3.5" /> {t('profile.premium.badge')}
          </span>
          <h1 className="relative mt-4 font-display text-2xl font-bold leading-tight">
            {t('profile.premium.title')}
          </h1>
          <p className="relative mt-2 text-sm text-muted-foreground">
            {t('profile.premium.description')}
          </p>


          {!isPremium && (
            <div className="relative mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
              {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => (
                <button
                  key={key}
                  onClick={() => setPlan(key)}
                  className={`relative rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    plan === key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {PLANS[key].label}
                  {key === 'yearly' && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {t('profile.premium.discount')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="relative mt-5 flex items-end gap-1.5">
            <span className="font-display text-4xl font-bold">{selected.price}</span>
            <span className="pb-1 text-sm text-muted-foreground">{selected.period}</span>
          </div>
          <p className="relative mt-1 text-xs text-muted-foreground">
            {selected.note}
          </p>
        </section>

        <div className="mt-5 rounded-[2rem] border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold mb-4">{t('profile.premium.compareFeatures')}</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-[1fr_80px_80px] bg-muted">
              <div className="px-4 py-3 text-xs font-semibold text-muted-foreground">{t('profile.premium.feature')}</div>
              <div className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground">{t('profile.premium.free')}</div>
              <div className="px-2 py-3 text-center text-xs font-semibold text-primary">Premium</div>
            </div>
            {FEATURES.map((feature, index) => (
              <div
                key={feature.label}
                className={`grid grid-cols-[1fr_80px_80px] items-center ${
                  index !== FEATURES.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="px-4 py-3.5 text-sm font-medium">{feature.label}</div>
                <div className="flex justify-center px-2 py-3.5">{feature.free}</div>
                <div className="flex justify-center px-2 py-3.5">{feature.premium}</div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl space-y-2">
          {loading ? (
            <Button disabled className="h-12 w-full rounded-2xl">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : isPremium ? (
            <>
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                <Check className="h-4 w-4" /> {t('profile.premium.activeSubscription')}
              </div>
              {subscription?.current_period_end && (
                <p className="text-center text-xs text-muted-foreground">
                  {subscription.cancel_at_period_end ? t('profile.premium.accessUntil') : t('profile.premium.nextRenewal')}
                  {new Date(subscription.current_period_end).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}
                </p>
              )}
              <Button variant="outline" onClick={handleManage} className="h-12 w-full rounded-2xl">
                {t('profile.premium.manage')}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="h-12 w-full rounded-2xl text-base font-semibold"
            >
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.cta}
            </Button>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            {t('profile.premium.secure')}
          </p>
        </div>
      </div>
    </div>
  );
};


export default PremiumPage;
