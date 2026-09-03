import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Footer from '@/components/Footer';

const LegalPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>{t('marketing.legal.meta.title')}</title>
        <meta name="description" content={t('marketing.legal.meta.description')} />
        <link rel="canonical" href="https://faunex.fr/legal" />
        <meta property="og:url" content="https://faunex.fr/legal" />
        <meta property="og:title" content={t('marketing.legal.meta.title')} />
      </Helmet>
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label={t('marketing.legal.back')} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">{t('marketing.legal.pageTitle')}</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8 text-sm text-foreground/80 leading-relaxed font-body">

        {/* Éditeur */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s1Title')}</h2>
          <p>{t('marketing.legal.s1Intro', { brand: 'Faunex' })}</p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>{t('marketing.legal.s1Name')}</strong> Valentin Moulay</li>
            <li><strong>{t('marketing.legal.s1Status')}</strong> {t('marketing.legal.s1StatusValue')}</li>
            <li><strong>{t('marketing.legal.s1Contact')}</strong> contact@faunex.fr</li>
          </ul>
        </section>

        {/* Hébergeur */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s2Title')}</h2>
          <p>{t('marketing.legal.s2Intro')}</p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>{t('marketing.legal.s2Host')}</strong> {t('marketing.legal.s2HostValue')}</li>
            <li>{t('marketing.legal.s2Location')}</li>
            <li>{t('marketing.legal.s2Site')} <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary underline">lovable.dev</a></li>
          </ul>
          <p className="mt-3">{t('marketing.legal.s2DomainIntro')}</p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>OVHcloud</strong></li>
            <li>{t('marketing.legal.s2OvhAddress')}</li>
            <li>{t('marketing.legal.s2Site')} <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">ovhcloud.com</a></li>
          </ul>
        </section>

        {/* Propriété intellectuelle */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s3Title')}</h2>
          <p>{t('marketing.legal.s3Text1')}</p>
          <p className="mt-2">{t('marketing.legal.s3Text2')}</p>
        </section>

        {/* Données personnelles / RGPD */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s4Title')}</h2>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4">
            <p className="font-display font-semibold text-foreground text-sm">
              {t('marketing.legal.s4Highlight')}
            </p>
          </div>
          <p>
            {t('marketing.legal.s4Text')}{' '}
            <Link to="/confidentialite" className="text-primary underline">{t('marketing.legal.s4Link')}</Link>.
          </p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s5Title')}</h2>
          <p>{t('marketing.legal.s5Text')}</p>
        </section>

        {/* Responsabilité */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s6Title')}</h2>
          <p>{t('marketing.legal.s6Text1')}</p>
          <p className="mt-2">{t('marketing.legal.s6Text2')}</p>
          <p className="mt-2">{t('marketing.legal.s6Text3')}</p>
        </section>

        {/* CGU */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s7Title')}</h2>
          <p>{t('marketing.legal.s7Intro', { brand: 'Faunex' })}</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">{t('marketing.legal.s71Title')}</h3>
          <p>{t('marketing.legal.s71Text')}</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">{t('marketing.legal.s72Title')}</h3>
          <p>
            {t('marketing.legal.s72Text1', {
              premium: t('marketing.legal.s72PremiumLabel'),
              monthly: t('marketing.legal.s72Monthly'),
              yearly: t('marketing.legal.s72Yearly'),
              pricingLink: '{{pricingLink}}',
            }).split('{{pricingLink}}')[0]}
            <a href="/tarifs" className="text-primary underline">{t('marketing.legal.s72PricingLink')}</a>
            {t('marketing.legal.s72Text1', {
              premium: t('marketing.legal.s72PremiumLabel'),
              monthly: t('marketing.legal.s72Monthly'),
              yearly: t('marketing.legal.s72Yearly'),
              pricingLink: '{{pricingLink}}',
            }).split('{{pricingLink}}')[1]}
          </p>
          <p className="mt-2">
            {t('marketing.legal.s72Text2', { settingsPath: t('marketing.legal.s72SettingsPath') })}
          </p>
          <p className="mt-2">
            {t('marketing.legal.s72Text3').split('{{paddleLink}}')[0]}
            <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t('marketing.legal.s72PaddleLink')}</a>{' '}
            {t('marketing.legal.s72Text3').split('{{paddleLink}}')[1]?.split('{{refundLink}}')[0]}
            <a href="/remboursement" className="text-primary underline">{t('marketing.legal.s72RefundLink')}</a>
            {t('marketing.legal.s72Text3').split('{{refundLink}}')[1]}
          </p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">{t('marketing.legal.s73Title')}</h3>
          <p>{t('marketing.legal.s73Text')}</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">{t('marketing.legal.s74Title')}</h3>
          <p>{t('marketing.legal.s74Text')}</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">{t('marketing.legal.s75Title')}</h3>
          <p>{t('marketing.legal.s75Text')}</p>

          <h3 className="text-base font-display font-semibold text-foreground mt-4 mb-1">{t('marketing.legal.s76Title')}</h3>
          <p>{t('marketing.legal.s76Text')}</p>
        </section>


        {/* Suppression de compte */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s8Title')}</h2>
          <p>{t('marketing.legal.s8Intro')}</p>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            <li>{t('marketing.legal.s8Step1', { bold: t('marketing.legal.s8Step1Bold') })}</li>
            <li>{t('marketing.legal.s8Step2', { bold: t('marketing.legal.s8Step2Bold') })}</li>
            <li>{t('marketing.legal.s8Step3', { bold: t('marketing.legal.s8Step3Bold') })}</li>
          </ol>
          <p className="mt-3">{t('marketing.legal.s8DeletionIntro')}</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>{t('marketing.legal.s8Item1')}</li>
            <li>{t('marketing.legal.s8Item2')}</li>
            <li>{t('marketing.legal.s8Item3')}</li>
          </ul>
          <p className="mt-3">
            {t('marketing.legal.s8Final', { bold: t('marketing.legal.s8FinalBold') })}
          </p>
        </section>

        {/* Droit applicable */}
        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.legal.s9Title')}</h2>
          <p>{t('marketing.legal.s9Text')}</p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 pb-8">
          {t('marketing.legal.footerDates')}
        </p>
      </div>
      <Footer />
    </main>
  );
};

export default LegalPage;
