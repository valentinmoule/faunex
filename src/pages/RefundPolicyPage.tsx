import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import Footer from '@/components/Footer';

const RefundPolicyPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>{t('marketing.refund.meta.title')}</title>
        <meta name="description" content={t('marketing.refund.meta.description')} />
        <link rel="canonical" href="https://faunex.fr/remboursement" />
        <meta property="og:url" content="https://faunex.fr/remboursement" />
        <meta property="og:title" content={t('marketing.refund.meta.title')} />
      </Helmet>

      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label={t('marketing.refund.back')} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">{t('marketing.refund.pageTitle')}</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8 text-sm text-foreground/80 leading-relaxed font-body">
        <section>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="font-display font-semibold text-foreground text-sm">
              {t('marketing.refund.highlight')}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.refund.s1Title')}</h2>
          <p>
            {t('marketing.refund.s1Text1', {
              premium: t('marketing.refund.s1PremiumLabel'),
              days: t('marketing.refund.s1DaysLabel'),
            })}
          </p>
          <p className="mt-2">
            {t('marketing.refund.s1Text2')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.refund.s2Title')}</h2>
          <p>
            {t('marketing.refund.s2Intro', { bold: t('marketing.refund.s2BoldPaddle') })}
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>
              {t('marketing.refund.s2Item1').split('{{link}}')[0]}
              <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">paddle.net</a>{' '}
              {t('marketing.refund.s2Item1').split('{{link}}')[1]}
            </li>
            <li>
              {t('marketing.refund.s2Item2').split('{{email}}')[0]}
              <strong>contact@faunex.fr</strong>
              {t('marketing.refund.s2Item2').split('{{email}}')[1]}
            </li>
          </ul>
          <p className="mt-2">
            {t('marketing.refund.s2Outro')}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.refund.s3Title')}</h2>
          <p>
            {t('marketing.refund.s3Text', { settingsPath: t('marketing.refund.s3SettingsPath') })}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.refund.s4Title')}</h2>
          <p>
            {t('marketing.refund.s4Text1').split('{{buyerTerms}}')[0]}
            <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {t('marketing.refund.s4BuyerTerms')}
            </a>{' '}
            {t('marketing.refund.s4Text1').split('{{buyerTerms}}')[1]?.split('{{refundPolicy}}')[0]}
            <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {t('marketing.refund.s4RefundPolicy')}
            </a>
            {t('marketing.refund.s4Text1').split('{{refundPolicy}}')[1]}
          </p>
          <p className="mt-2">
            {t('marketing.refund.s4Text2').split('{{legalLink}}')[0]}
            <Link to="/legal" className="text-primary underline">{t('marketing.refund.s4LegalLink')}</Link>{' '}
            {t('marketing.refund.s4Text2').split('{{legalLink}}')[1]?.split('{{pricingLink}}')[0]}
            <Link to="/tarifs" className="text-primary underline">{t('marketing.refund.s4PricingLink')}</Link>
            {t('marketing.refund.s4Text2').split('{{pricingLink}}')[1]}
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 pb-8">{t('marketing.refund.footerDate')}</p>
      </div>

      <Footer />
    </main>
  );
};

export default RefundPolicyPage;
