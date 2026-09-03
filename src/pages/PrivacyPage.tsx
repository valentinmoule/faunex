import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import Footer from '@/components/Footer';

const PrivacyPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>{t('marketing.privacy.meta.title')}</title>
        <meta name="description" content={t('marketing.privacy.meta.description')} />
        <link rel="canonical" href="https://faunex.fr/confidentialite" />
        <meta property="og:url" content="https://faunex.fr/confidentialite" />
        <meta property="og:title" content={t('marketing.privacy.meta.title')} />
        <meta property="og:type" content="website" />
        <meta property="og:description" content={t('marketing.privacy.meta.ogDescription')} />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label={t('marketing.privacy.back')}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">{t('marketing.privacy.pageTitle')}</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-8 text-sm text-foreground/80 leading-relaxed font-body">
        <section>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="font-display font-semibold text-foreground text-sm">
              {t('marketing.privacy.highlight')}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s1Title')}</h2>
          <p>{t('marketing.privacy.s1Intro', { brand: 'Faunex' })}</p>
          <ul className="mt-2 space-y-1 list-none">
            <li><strong>{t('marketing.privacy.s1Controller')}</strong> Valentin Moulay</li>
            <li><strong>{t('marketing.privacy.s1Status')}</strong> {t('marketing.privacy.s1StatusValue')}</li>
            <li><strong>{t('marketing.privacy.s1Contact')}</strong> contact@faunex.fr</li>
          </ul>
          <p className="mt-2">{t('marketing.privacy.s1Outro')}</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s2Title')}</h2>
          <p>{t('marketing.privacy.s2Intro')}</p>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li>{t('marketing.privacy.s2Item1')}</li>
            <li>{t('marketing.privacy.s2Item2')}</li>
            <li>{t('marketing.privacy.s2Item3')}</li>
            <li>{t('marketing.privacy.s2Item4')}</li>
            <li>{t('marketing.privacy.s2Item5')}</li>
            <li>{t('marketing.privacy.s2Item6')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s3Title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-display font-semibold text-foreground">{t('marketing.privacy.s3ColPurpose')}</th>
                  <th className="py-2 pl-3 font-display font-semibold text-foreground">{t('marketing.privacy.s3ColBasis')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row1P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row1B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row2P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row2B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row3P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row3B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row4P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row4B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row5P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row5B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row6P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row6B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row7P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row7B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row8P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row8B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row9P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row9B')}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">{t('marketing.privacy.s3Row10P')}</td>
                  <td className="py-2 pl-3">{t('marketing.privacy.s3Row10B')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s4Title')}</h2>
          <p>{t('marketing.privacy.s4Intro')}</p>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li><strong>{t('marketing.privacy.s4Item1')}</strong></li>
            <li><strong>{t('marketing.privacy.s4Item2Intro')}</strong>
              <ul className="mt-1 ml-4 space-y-1 list-disc list-inside text-foreground/70">
                <li>{t('marketing.privacy.s4Sub1')}</li>
                <li>{t('marketing.privacy.s4Sub2')}</li>
                <li>{t('marketing.privacy.s4Sub3')}</li>
                <li>{t('marketing.privacy.s4Sub4')}</li>
                <li>{t('marketing.privacy.s4Sub5')}</li>
                <li>{t('marketing.privacy.s4Sub6')}</li>
              </ul>
            </li>
            <li><strong>{t('marketing.privacy.s4Item3')}</strong></li>
            <li><strong>{t('marketing.privacy.s4Item4')}</strong></li>
          </ul>
          <p className="mt-2">{t('marketing.privacy.s4Outro')}</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s5Title')}</h2>
          <p>{t('marketing.privacy.s5Text')}</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s6Title')}</h2>
          <ul className="mt-2 space-y-2 list-disc list-inside">
            <li><strong>{t('marketing.privacy.s6Item1')}</strong></li>
            <li><strong>{t('marketing.privacy.s6Item2')}</strong></li>
            <li><strong>{t('marketing.privacy.s6Item3')}</strong></li>
            <li><strong>{t('marketing.privacy.s6Item4')}</strong></li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s7Title')}</h2>
          <p>{t('marketing.privacy.s7Intro')}</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>{t('marketing.privacy.s7Item1')}</strong></li>
            <li><strong>{t('marketing.privacy.s7Item2')}</strong></li>
            <li><strong>{t('marketing.privacy.s7Item3')}</strong></li>
            <li><strong>{t('marketing.privacy.s7Item4')}</strong></li>
            <li><strong>{t('marketing.privacy.s7Item5')}</strong></li>
            <li><strong>{t('marketing.privacy.s7Item6')}</strong></li>
            <li><strong>{t('marketing.privacy.s7Item7')}</strong></li>
          </ul>
          <p className="mt-2">
            {t('marketing.privacy.s7Outro').split('{{email}}')[0]}
            <strong>contact@faunex.fr</strong>
            {t('marketing.privacy.s7Outro').split('{{email}}')[1]?.split('{{cnilLink}}')[0]}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary underline">{t('marketing.privacy.s7CnilLink')}</a>
            {t('marketing.privacy.s7Outro').split('{{cnilLink}}')[1]}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s8Title')}</h2>
          <p>{t('marketing.privacy.s8Intro')}</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>{t('marketing.privacy.s8Item1')}</li>
            <li>{t('marketing.privacy.s8Item2')}</li>
            <li>{t('marketing.privacy.s8Item3')}</li>
            <li>{t('marketing.privacy.s8Item4')}</li>
            <li>{t('marketing.privacy.s8Item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s9Title')}</h2>
          <p>{t('marketing.privacy.s9Text')}</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s10Title')}</h2>
          <p>{t('marketing.privacy.s10Text')}</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s11Title')}</h2>
          <p>{t('marketing.privacy.s11Text')}</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-2">{t('marketing.privacy.s12Title')}</h2>
          <p>
            {t('marketing.privacy.s12Text').split('{{email}}')[0]}
            <strong>contact@faunex.fr</strong>
            {t('marketing.privacy.s12Text').split('{{email}}')[1]}
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4 pb-8">
          {t('marketing.privacy.footerDates')}
        </p>
      </div>

      <Footer />
    </main>
  );
};

export default PrivacyPage;
