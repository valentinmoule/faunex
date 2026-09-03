import { ArrowLeft, Check, Crown, Infinity as InfinityIcon, MapPin, NotebookPen, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/PageHeader';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useTranslation, Trans } from 'react-i18next';

const useFreeFeatures = (t: (key: string) => string) => [
  t('profile.pricing.free.captures'),
  t('profile.pricing.free.aiIdentification'),
  t('profile.pricing.free.bestiary'),
  t('profile.pricing.free.social'),
];

const usePremiumFeatures = (t: (key: string) => string) => [
  { icon: InfinityIcon, title: t('profile.pricing.features.unlimitedCaptures.title'), description: t('profile.pricing.features.unlimitedCaptures.description') },
  { icon: Sparkles, title: t('profile.pricing.features.betterDetection.title'), description: t('profile.pricing.features.betterDetection.description') },
  { icon: MapPin, title: t('profile.pricing.features.location.title'), description: t('profile.pricing.features.location.description') },
  { icon: NotebookPen, title: t('profile.pricing.features.notes.title'), description: t('profile.pricing.features.notes.description') },
  { icon: Crown, title: t('profile.pricing.features.moreToCome.title'), description: t('profile.pricing.features.moreToCome.description') },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const FREE_FEATURES = useFreeFeatures(t);
  const PREMIUM_FEATURES = usePremiumFeatures(t);

  return (
    <main className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Tarifs — Faunex Premium à 2,40 €/mois ou 24 €/an</title>
        <meta name="description" content="Faunex est gratuit avec 4 captures par jour. Faunex Premium : 2,40 € par mois ou 24 € par an (2 mois offerts) — captures illimitées, détection et modération plus performantes, localisation et notes. Sans engagement." />
        <link rel="canonical" href="https://faunex.fr/tarifs" />
        <meta property="og:url" content="https://faunex.fr/tarifs" />
        <meta property="og:title" content="Tarifs — Faunex Premium à 2,40 €/mois ou 24 €/an" />
      </Helmet>

      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label={t('profile.pricing.backAria')} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">{t('profile.pricing.title')}</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-6">
        <p className="text-sm text-muted-foreground font-body">
          <Trans i18nKey="profile.pricing.editor" components={{ strong: <strong /> }} />
        </p>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-foreground">{t('profile.pricing.free.title')}</h2>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="font-display text-3xl font-bold text-foreground">0 €</span>
            <span className="pb-1 text-sm text-muted-foreground">/ mois</span>
          </div>
          <ul className="mt-4 space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/80 font-body">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 shadow-sm">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Crown className="h-3.5 w-3.5" /> {t('profile.pricing.premiumBadge')}
          </span>
          <div className="relative mt-3 flex items-end gap-1.5">
            <span className="font-display text-4xl font-bold text-foreground">2,40 €</span>
            <span className="pb-1 text-sm text-muted-foreground">/ mois</span>
          </div>
          <div className="relative mt-1 flex items-end gap-1.5">
            <span className="font-display text-2xl font-bold text-foreground">24 €</span>
            <span className="pb-0.5 text-sm text-muted-foreground">/ an</span>
            <span className="mb-1 ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {t('profile.pricing.twoMonthsOffered')}
            </span>
          </div>
          <p className="relative mt-1 text-xs text-muted-foreground font-body">
            {t('profile.pricing.billingNote')}
          </p>

          <ul className="relative mt-5 space-y-3">
            {PREMIUM_FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground font-body">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button asChild className="relative mt-6 h-12 w-full rounded-2xl text-base font-semibold">
            <Link to="/premium">{t('profile.pricing.chooseSubscription')}</Link>
          </Button>
          <p className="relative mt-2 text-center text-[11px] text-muted-foreground font-body">
            {t('profile.pricing.accountRequired')}
          </p>
        </section>

        <p className="text-sm text-muted-foreground font-body">
          {t('profile.pricing.seeAlso')}{' '}
          <Link to="/remboursement" className="text-primary underline">{t('profile.pricing.refundPolicy')}</Link> {t('profile.pricing.and')}{' '}
          <Link to="/legal" className="text-primary underline">{t('profile.pricing.terms')}</Link>.
        </p>
      </div>

      <Footer />
    </main>
  );
};

export default PricingPage;
