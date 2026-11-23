import { ArrowLeft, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import Footer from '@/components/Footer';

const CaptureRulesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const accepted = t('marketing.captureRules.accepted', { returnObjects: true }) as string[];
  const rejected = t('marketing.captureRules.rejected', { returnObjects: true }) as string[];
  const respect = t('marketing.captureRules.respect', { returnObjects: true }) as string[];

  return (
    <main className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>{t('marketing.captureRules.meta.title')}</title>
        <meta name="description" content={t('marketing.captureRules.meta.description')} />
        <link rel="canonical" href="https://faunex.fr/regles-captures" />
        <meta property="og:url" content="https://faunex.fr/regles-captures" />
        <meta property="og:title" content={t('marketing.captureRules.meta.title')} />
        <meta property="og:description" content={t('marketing.captureRules.meta.description')} />
      </Helmet>

      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label={t('marketing.captureRules.back')} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">{t('marketing.captureRules.pageTitle')}</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8 text-sm text-foreground/80 leading-relaxed font-body">
        <p>{t('marketing.captureRules.intro')}</p>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-3">{t('marketing.captureRules.acceptedTitle')}</h2>
          <ul className="space-y-2">
            {accepted.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={3} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-3">{t('marketing.captureRules.rejectedTitle')}</h2>
          <ul className="space-y-2">
            {rejected.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" strokeWidth={3} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.captureRules.respectTitle')}</h2>
          <p>{t('marketing.captureRules.respectIntro')}</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            {respect.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 space-y-2">
            <p className="font-display font-semibold text-foreground text-sm">
              {t('marketing.captureRules.mainRule')}
            </p>
            <p>{t('marketing.captureRules.mainRuleText')}</p>
          </div>
        </section>

        <p className="font-display font-semibold text-foreground pb-8">{t('marketing.captureRules.thanks')}</p>
      </div>

      <Footer />
    </main>
  );
};

export default CaptureRulesPage;
