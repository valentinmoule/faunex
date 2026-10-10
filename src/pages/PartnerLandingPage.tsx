import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Camera, ScanLine, Layers, Leaf, Users, Heart, Mail, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import associationPhoto from '@/assets/partners/association-walk.jpg';
import zooPhoto from '@/assets/partners/zoo-visibility.jpg';

type Item = { title: string; desc: string };
type Question = { q: string; a: string };

export default function PartnerLandingPage({ audience }: { audience: 'zoo' | 'associations' }) {
  const { t } = useTranslation();
  const key = `partners.${audience}`;
  const path = audience === 'zoo' ? '/zoo' : '/associations';
  const items = (name: string) => t(name, { returnObjects: true }) as Item[];
  const faq = t(`${key}.faq`, { returnObjects: true }) as Question[];
  const contact = `mailto:contact@faunex.fr?subject=${encodeURIComponent(t(`${key}.subject`))}`;
  const benefits = [Users, Leaf, Heart];
  const steps = [Camera, ScanLine, Layers];
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>{t(`${key}.metaTitle`)}</title>
        <meta name="description" content={t(`${key}.description`)} />
        <link rel="canonical" href={`https://faunex.fr${path}`} />
        <meta property="og:title" content={t(`${key}.metaTitle`)} />
        <meta property="og:description" content={t(`${key}.description`)} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://faunex.fr${path}`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl">
            <img src="/pwa-icon-192.png" alt="" width={32} height={32} />Faunex
          </Link>
          <nav aria-label={t('partners.nav.label')} className="flex items-center gap-1">
            {(['zoo', 'associations'] as const).map((entry) => (
              <Button key={entry} asChild variant="ghost" size="sm" className={audience === entry ? 'text-primary bg-primary/10' : ''}>
                <Link to={entry === 'zoo' ? '/zoo' : '/associations'} aria-current={audience === entry ? 'page' : undefined}>{t(`partners.nav.${entry}`)}</Link>
              </Button>
            ))}
          </nav>
        </div>
      </header>
      <section className="relative isolate min-h-[540px] sm:min-h-[580px] flex items-center">
        <img src={audience === 'zoo' ? zooPhoto : associationPhoto} alt={t(`${key}.imageAlt`)} width={1536} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-foreground/65" />
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20 text-primary-foreground">
          <p className="font-display text-xs font-semibold mb-5">{t(`${key}.eyebrow`)}</p>
          <h1 className="max-w-xl text-4xl sm:text-5xl font-display font-bold leading-tight">{t(`${key}.title`)}</h1>
          <p className="mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-primary-foreground/90">{t(`${key}.subtitle`)}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg"><a href={contact}>{t('partners.contact')}<ArrowRight /></a></Button>
            <Button asChild variant="link" className="text-primary-foreground"><Link to="/">{t('partners.nav.app')}<ArrowRight /></Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <h2 className="max-w-2xl text-3xl font-display font-bold">{t(`${key}.audienceTitle`)}</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">{t(`${key}.audienceDesc`)}</p>
        <div className="grid md:grid-cols-3 gap-8 mt-10">
          {items(`${key}.benefits`).map((item, i) => { const Icon = benefits[i] ?? Leaf; return (
            <div key={item.title} className="border-t border-border pt-6"><Icon className="h-6 w-6 text-primary mb-4" /><h3 className="font-display text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p></div>
          ); })}
        </div>
      </section>
      <section className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <h2 className="text-3xl font-display font-bold">{t('partners.principleTitle')}</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">{t('partners.principleDesc')}</p>
          <div className="mt-10 grid md:grid-cols-3 gap-8">
            {items('partners.steps').map((item, i) => { const Icon = steps[i] ?? Camera; return (
              <div key={item.title}><div className="flex items-center gap-3 mb-4"><Icon className="h-5 w-5 text-primary" /><span className="text-xs font-display text-muted-foreground">0{i + 1}</span></div><h3 className="font-display text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p></div>
            ); })}
          </div>
          <img src="/landing/faunex-app-mockups.webp" alt={t('partners.showcaseAlt')} loading="lazy" width={1080} height={700} className="mx-auto mt-10 h-auto w-full max-w-4xl" />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <h2 className="text-3xl font-display font-bold">{t(`${key}.offerTitle`)}</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">{t(`${key}.offerDesc`)}</p>
        <div className="mt-10 divide-y divide-border">
          {items(`${key}.offers`).map((item, i) => (
            <div key={item.title} className="grid sm:grid-cols-[60px_1fr_1.2fr] gap-3 sm:gap-6 py-7"><span className="font-display text-primary font-semibold">0{i + 1}</span><h3 className="text-xl font-display font-semibold">{item.title}</h3><p className="text-muted-foreground leading-relaxed">{item.desc}</p></div>
          ))}
        </div>
      </section>
      <section className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <h2 className="text-3xl font-display font-bold">{t('partners.processTitle')}</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-8">{items('partners.process').map((item, i) => (
            <div key={item.title}><p className="text-primary font-display text-sm mb-3">0{i + 1}</p><h3 className="font-display text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p></div>
          ))}</div>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <h2 className="text-3xl font-display font-bold mb-8">{t('partners.faqTitle')}</h2>
        <div className="divide-y divide-border">{faq.map((item) => (
          <details key={item.q} className="group py-5"><summary className="list-none cursor-pointer flex items-center justify-between gap-4 font-display font-semibold">{item.q}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-180 transition-transform motion-reduce:transition-none" /></summary><p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p></details>
        ))}</div>
      </section>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20"><h2 className="text-3xl font-display font-bold max-w-2xl">{t(`${key}.finalTitle`)}</h2><p className="mt-4 max-w-xl text-primary-foreground/90 leading-relaxed">{t(`${key}.finalDesc`)}</p><Button asChild variant="secondary" size="lg" className="mt-7"><a href={contact}><Mail />{t('partners.contact')}</a></Button><p className="mt-4 text-sm"><a href={contact} className="underline underline-offset-4">{t('partners.contactNote')}</a></p></div>
      </section>
      <Footer />
    </main>
  );
}
