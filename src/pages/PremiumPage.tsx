import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Crown, UserRound, Users, ScanLine, MapPin, Images, FolderHeart, Trophy, BadgeCheck } from 'lucide-react';
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
import { CancelSurveySheet } from '@/components/CancelSurveySheet';
import { PremiumReferral } from '@/components/PremiumReferral';
import { getPaddleEnvironment } from '@/lib/paddle';
import { hasActiveFamily, readFamily, type FamilyInfo } from '@/lib/family';

const BENEFITS = [
  { icon: ScanLine, key: 'identification' },
  { icon: MapPin, key: 'exploration' },
  { icon: FolderHeart, key: 'collections' },
  { icon: Images, key: 'photos' },
  { icon: Trophy, key: 'ranking' },
  { icon: BadgeCheck, key: 'badge' },
] as const;

const usePlans = (t: (key: string) => string) => ({
  monthly: {
    priceId: PREMIUM_MONTHLY_PRICE_ID,
    label: t('profile.premium.plans.monthly.label'),
    price: '2,40 €',
    period: t('profile.premium.presentation.perMonth'),
    note: t('profile.premium.plans.monthly.note'),
    cta: t('profile.premium.plans.monthly.cta'),
  },
  yearly: {
    priceId: PREMIUM_YEARLY_PRICE_ID,
    label: t('profile.premium.plans.yearly.label'),
    price: '24 €',
    period: t('profile.premium.presentation.perYear'),
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
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralBusy, setReferralBusy] = useState(false);
  const [bonusDays, setBonusDays] = useState(0);
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const familyActive = hasActiveFamily(family);
  useEffect(() => {
    let cancelled = false;
    if (!session?.user.id) {
      setFamily(null);
      return;
    }
    supabase.rpc('my_family').then(({ data, error }) => {
      if (!cancelled) setFamily(error ? null : readFamily(data));
    });
    return () => { cancelled = true; };
  }, [session?.user.id, subscription]);
  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from('referral_rewards').select('days').eq('user_id', session.user.id)
      .eq('environment', getPaddleEnvironment()).gt('ends_at', new Date().toISOString())
      .then(({ data }) => setBonusDays((data ?? []).reduce((sum, item) => sum + item.days, 0)));
  }, [session?.user.id, subscription]);
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
    const referralId = params.get('referral');
    setPlan(wanted);
    params.delete('checkout');
    params.delete('plan');
    params.delete('email');
    params.delete('uid');
    params.delete('referral');
    setParams(params, { replace: true });
    if (!uid) {
      navigate('/auth');
      return;
    }
    openCheckout({
      priceId: wanted === 'monthly' ? PREMIUM_MONTHLY_PRICE_ID : PREMIUM_YEARLY_PRICE_ID,
      plan: wanted,
      customerEmail: email,
      customData: { userId: uid, ...(referralId && wanted === 'yearly' ? { referralId } : {}) },
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
      setReferralBusy(true);
      let referralId: string | undefined;
      if (plan === 'yearly' && referralCode.trim()) {
        const { data, error } = await supabase.rpc('reserve_referral', { p_code: referralCode, p_env: getPaddleEnvironment() });
        if (error) {
          const reason = ['self_referral', 'existing_customer', 'referral_already_set'].find(key => error.message.includes(key)) ?? 'invalid_code';
          toast.error(t(`profile.premium.referral.errors.${reason}`));
          return;
        }
        referralId = data;
      }
      await openCheckout({
        priceId: selected.priceId,
        plan,
        customerEmail: session.user.email ?? undefined,
        customData: { userId: session.user.id, ...(referralId ? { referralId } : {}) },
        successUrl: `${window.location.origin}/premium?checkout=success`,
      });
    } catch (e) {
      console.error(e);
      toast.error(t('profile.premium.checkoutError'));
    } finally {
      setReferralBusy(false);
    }
  };

  const handleManage = async () => {
    if (IS_NATIVE_APP) {
      // Dans l'app native, `window.open` n'ouvre rien d'utilisable : on passe
      // par le navigateur système.
      const { data, error } = await supabase.functions.invoke('paddle-portal', { body: { environment: getPaddleEnvironment() } });
      if (error || !data?.url) {
        toast.error(t('profile.premium.manageError'));
        return;
      }
      await Browser.open({ url: data.url as string });
      return;
    }
    // Ouvre l'onglet immédiatement (dans le geste utilisateur) pour éviter le blocage de popup
    const tab = window.open('', '_blank');
    const { data, error } = await supabase.functions.invoke('paddle-portal', { body: { environment: getPaddleEnvironment() } });
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
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon"
            onClick={() => navigate(-1)}
            aria-label={t('profile.premium.backAria')}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <h1 className="text-xl font-display font-bold text-foreground">{t('profile.premium.badge')}</h1>
        </div>
      </PageHeader>

      <main className="mx-auto max-w-3xl px-5 pt-6 pb-24">
        <section>
          <Crown className="h-6 w-6 text-primary" aria-hidden />
          <h2 className="mt-3 font-display text-2xl font-bold leading-tight">
            {t('profile.premium.title')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t('profile.premium.description')}
          </p>


        </section>

        <section className="mt-8" aria-labelledby="premium-plans">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="premium-plans" className="font-display text-lg font-semibold">{t('profile.premium.presentation.available')}</h2>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((key) => (
                <Button variant="ghost" size="sm"
                  key={key}
                  onClick={() => setPlan(key)}
                  aria-pressed={plan === key}
                  className={`px-3 text-sm font-semibold ${
                    plan === key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {PLANS[key].label}
                  {key === 'yearly' && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {t('profile.premium.discount')}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <article className="flex flex-col rounded-lg border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><UserRound className="size-4" aria-hidden />{t('profile.premium.badge')}</div>
              <h3 className="mt-3 font-display text-2xl font-bold text-primary">{t('profile.premium.presentation.personal')}</h3>
              <p className="mt-3 flex items-baseline gap-1.5"><span className="font-display text-3xl font-bold">{selected.price}</span><span className="text-sm text-muted-foreground">{selected.period}</span></p>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{selected.note}</p>
              <ul className="my-5 space-y-3 border-t border-border pt-5 text-sm leading-relaxed">
                {['personalAccounts', 'allBenefits', 'personalCollection', 'cancelAnytime'].map(key => <li key={key} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{t(`profile.premium.presentation.${key}`)}</span></li>)}
              </ul>
              <Button onClick={handleSubscribe} disabled={checkoutLoading || referralBusy || loading || isPremium} className="mt-auto h-auto min-h-12 w-full whitespace-normal py-3">
                {checkoutLoading || referralBusy ? <Loader2 className="size-4 animate-spin" /> : t(isPremium && !familyActive ? 'profile.premium.activeSubscription' : 'profile.premium.presentation.choosePersonal')}
              </Button>
            </article>
            <article className="flex flex-col rounded-lg border border-primary/25 bg-secondary p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Users className="size-4" aria-hidden />{t('profile.premium.badge')}</div>
              <h3 className="mt-3 font-display text-2xl font-bold text-primary">{t('profile.premium.presentation.family')}</h3>
              <p className="mt-3 flex items-baseline gap-1.5"><span className="font-display text-3xl font-bold">{plan === 'yearly' ? '40 €' : '4 €'}</span><span className="text-sm text-muted-foreground">{selected.period}</span></p>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{t(`profile.premium.presentation.family${plan === 'yearly' ? 'Yearly' : 'Monthly'}Note`)}</p>
              <ul className="my-5 space-y-3 border-t border-primary/15 pt-5 text-sm leading-relaxed">
                {['familyAccounts', 'allBenefits', 'familyIndependent', 'familyInvites', 'cancelAnytime'].map(key => <li key={key} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{t(`profile.premium.presentation.${key}`)}</span></li>)}
              </ul>
              <Button onClick={() => navigate('/family')} className="mt-auto h-auto min-h-12 w-full whitespace-normal py-3">{t(familyActive ? 'family.active' : 'profile.premium.presentation.chooseFamily')}</Button>
            </article>
          </div>
        </section>

        <section className="mt-9 border-t border-border pt-7" aria-labelledby="premium-benefits">
          <h2 id="premium-benefits" className="font-display text-xl font-bold">{t('profile.premium.presentation.why')}</h2>
          <ul className="mt-5 space-y-5">
            {BENEFITS.map(({ icon: Icon, key }) => <li key={key} className="flex items-center gap-4"><Icon className="size-6 shrink-0 text-primary" strokeWidth={1.75} aria-hidden /><span className="text-sm leading-relaxed">{t(`profile.premium.presentation.benefits.${key}`)}</span></li>)}
          </ul>
        </section>

        {session?.user && <PremiumReferral userId={session.user.id} eligible={!loading && !subscription && !isPremium && plan === 'yearly'} code={referralCode} onCodeChange={setReferralCode} />}
        {bonusDays > 0 && <p className="mb-5 text-sm font-medium text-primary">{t('profile.premium.referral.bonus', { days: bonusDays })}</p>}
      </main>

      {isPremium && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/90 backdrop-blur-xl px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl space-y-2">
            {loading ? (
              <Button disabled className="h-12 w-full rounded-2xl">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : isPremium ? (
              <>
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                  <Check className="h-4 w-4" /> {t(familyActive ? 'family.active' : 'profile.premium.activeSubscription')}
                </div>
                {familyActive && <Button variant="outline" onClick={() => navigate('/family')} className="h-12 w-full rounded-2xl">{t('family.title')}</Button>}
                {subscription?.current_period_end && (
                  <p className="text-center text-xs text-muted-foreground">
                    {familyActive && <>{t('profile.premium.presentation.personal')} · </>}
                    {subscription.cancel_at_period_end ? t('profile.premium.accessUntil') : t('profile.premium.nextRenewal')}
                    {new Date(subscription.current_period_end).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}
                  </p>
                )}
                {subscription && <Button variant="outline" onClick={handleManage} className="h-12 w-full rounded-2xl">
                  {familyActive && <>{t('profile.premium.presentation.personal')} · </>}
                  {t('profile.premium.manage')}
                </Button>}
                {subscription && !subscription.cancel_at_period_end && session?.user && (
                  <button type="button" onClick={() => setSurveyOpen(true)} className="w-full py-1 text-center text-xs text-muted-foreground underline-offset-2 hover:underline">
                    {t('profile.premium.cancel')}
                  </button>
                )}
              </>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={checkoutLoading || referralBusy || loading}
                className="h-12 w-full rounded-2xl text-base font-semibold"
              >
                {checkoutLoading || referralBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.cta}
              </Button>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              {t('profile.premium.secure')}
            </p>
          </div>
        </div>,
        document.body
      )}
      {session?.user && (
        <CancelSurveySheet open={surveyOpen} onOpenChange={setSurveyOpen} userId={session.user.id} onContinue={handleManage} />
      )}
    </div>
  );
};


export default PremiumPage;
