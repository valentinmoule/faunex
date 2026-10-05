import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Brain, Building2, Calendar, Camera, Check, ChevronRight, Heart, HeartHandshake,
  Leaf, Mail, MapPin, MessageCircle, Sparkles, Star, TrendingUp, Trophy, Users, Wrench,
} from 'lucide-react';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalUsers: number;
  totalCaptures: number;
}

const CONTACT_EMAIL = 'contact@faunex.fr';

// Count-up hook with intersection observer (same behavior as the B2C landing)
const useCountUp = (target: number, duration = 1500) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!ref.current || triggered.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Math.floor(eased * target));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return { ref, value };
};

const Stat = ({ value, label, prefix }: { value: number; label: string; prefix?: string }) => {
  const { ref, value: animated } = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-2xl sm:text-3xl font-display font-black text-primary tabular-nums">
        <span ref={ref}>{prefix}{animated.toLocaleString('fr-FR')}</span>
      </p>
      <p className="text-[11px] sm:text-xs text-muted-foreground font-display uppercase tracking-wider mt-0.5">
        {label}
      </p>
    </div>
  );
};

/** Renders a title with an italic primary-colored highlight: value uses __HL__ as the placeholder. */
const HighlightTitle = ({ value, highlight }: { value: string; highlight: string }) => {
  const [before, after] = value.split('__HL__');
  return (
    <>
      {before}
      <span className="font-editorial italic text-primary">{highlight}</span>
      {after}
    </>
  );
};

const ZooLandingPage = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 5000,
    totalCaptures: 100000,
  });
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    supabase.functions.invoke('public-stats').then(({ data }) => {
      if (data && typeof data === 'object') {
        setStats((prev) => ({ ...prev, ...(data as Stats) }));
      }
    });
  }, []);

  // Sticky CTA after ~18% scroll
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setShowStickyCta(scrolled > 0.18 && scrolled < 0.92);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const audienceItems = [
    { icon: Users, title: t('marketing.zoo.audience.item1Title'), desc: t('marketing.zoo.audience.item1Desc') },
    { icon: Heart, title: t('marketing.zoo.audience.item2Title'), desc: t('marketing.zoo.audience.item2Desc') },
    { icon: Leaf, title: t('marketing.zoo.audience.item3Title'), desc: t('marketing.zoo.audience.item3Desc') },
    { icon: BarChart3, title: t('marketing.zoo.audience.item4Title'), desc: t('marketing.zoo.audience.item4Desc') },
  ];

  const principleSteps = [
    { icon: Camera, num: '01', title: t('marketing.zoo.principle.step1Title'), desc: t('marketing.zoo.principle.step1Desc'), rot: '-rotate-2', tint: 'from-primary/15 to-primary/5' },
    { icon: Brain, num: '02', title: t('marketing.zoo.principle.step2Title'), desc: t('marketing.zoo.principle.step2Desc'), rot: 'rotate-1', tint: 'from-amber/20 to-amber/5' },
    { icon: Trophy, num: '03', title: t('marketing.zoo.principle.step3Title'), desc: t('marketing.zoo.principle.step3Desc'), rot: '-rotate-1', tint: 'from-rarity-silver/15 to-rarity-silver/5' },
  ];

  const integrationItems = [
    { icon: MapPin, title: t('marketing.zoo.integration.item1Title'), desc: t('marketing.zoo.integration.item1Desc') },
    { icon: Star, title: t('marketing.zoo.integration.item2Title'), desc: t('marketing.zoo.integration.item2Desc') },
    { icon: Calendar, title: t('marketing.zoo.integration.item3Title'), desc: t('marketing.zoo.integration.item3Desc') },
    { icon: HeartHandshake, title: t('marketing.zoo.integration.item4Title'), desc: t('marketing.zoo.integration.item4Desc') },
  ];

  const onboardingSteps = [
    { icon: MessageCircle, num: '01', title: t('marketing.zoo.onboarding.step1Title'), desc: t('marketing.zoo.onboarding.step1Desc') },
    { icon: Wrench, num: '02', title: t('marketing.zoo.onboarding.step2Title'), desc: t('marketing.zoo.onboarding.step2Desc') },
    { icon: TrendingUp, num: '03', title: t('marketing.zoo.onboarding.step3Title'), desc: t('marketing.zoo.onboarding.step3Desc') },
  ];

  const faq = [
    { q: t('marketing.zoo.faq.q1'), a: t('marketing.zoo.faq.a1') },
    { q: t('marketing.zoo.faq.q2'), a: t('marketing.zoo.faq.a2') },
    { q: t('marketing.zoo.faq.q3'), a: t('marketing.zoo.faq.a3') },
    { q: t('marketing.zoo.faq.q4'), a: t('marketing.zoo.faq.a4') },
  ];

  const contactHref = `mailto:${CONTACT_EMAIL}`;

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden pb-20">
      <Helmet>
        <title>{t('marketing.zoo.meta.title')}</title>
        <meta name="description" content={t('marketing.zoo.meta.description')} />
        <link rel="canonical" href="https://faunex.fr/zoo" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://faunex.fr/zoo" />
        <meta property="og:title" content={t('marketing.zoo.meta.ogTitle')} />
        <meta property="og:description" content={t('marketing.zoo.meta.ogDescription')} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t('marketing.zoo.meta.ogTitle'),
          description: t('marketing.zoo.meta.description'),
          url: 'https://faunex.fr/zoo',
        })}</script>
      </Helmet>

      {/* HERO */}
      <section className="relative px-5 pt-10 pb-14 sm:pt-14 overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-60 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute top-20 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-44 -left-24 w-72 h-72 bg-amber/15 rounded-full blur-3xl pointer-events-none" />

        <div className="hidden sm:block absolute top-6 left-6 font-handwritten text-sm text-muted-foreground/70 -rotate-3 pointer-events-none select-none">
          N&nbsp;48°51' · E&nbsp;2°21'
        </div>
        <div className="hidden sm:block absolute top-6 right-6 font-handwritten text-sm text-muted-foreground/70 rotate-2 pointer-events-none select-none">
          Espace&nbsp;établissements
        </div>

        <div className="relative z-10 max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-display font-semibold mb-5">
            <Building2 className="w-3 h-3" />
            <span>{t('marketing.zoo.hero.badge')}</span>
          </div>

          <img src="/pwa-icon-512.png" alt={t('marketing.zoo.hero.logoAlt')} width="56" height="56" fetchPriority="high" className="w-14 h-14 mx-auto mb-3" />

          <h1 className="font-display font-black tracking-tight leading-[1.05] text-4xl sm:text-5xl">
            <HighlightTitle
              value={t('marketing.zoo.hero.title')}
              highlight={t('marketing.zoo.hero.titleHighlight')}
            />
            <span className="text-foreground">.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground font-body max-w-md mx-auto">
            {t('marketing.zoo.hero.subtitle')}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a href={contactHref} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto font-display font-bold gap-2 text-base px-7 py-6 rounded-2xl shadow-[0_8px_24px_-8px_hsla(150,55%,30%,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <Mail className="w-5 h-5" />
                {t('marketing.zoo.hero.cta')}
              </Button>
            </a>
            <Link
              to="/"
              className="text-sm text-muted-foreground font-display font-semibold hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              {t('marketing.zoo.hero.secondaryCta')} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <p className="mt-1 text-[11px] text-muted-foreground font-display">
              {t('marketing.zoo.hero.note')}
            </p>
          </div>
        </div>
      </section>

      {/* AUDIENCE — enjeux */}
      <section className="relative px-5 py-16 border-b border-border/50 overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-30 pointer-events-none" />
        <div className="relative max-w-lg sm:max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
              <HighlightTitle
                value={t('marketing.zoo.audience.title')}
                highlight={t('marketing.zoo.audience.titleHighlight')}
              />
            </h2>
            <p className="mt-3 text-muted-foreground text-sm font-body max-w-md mx-auto">
              {t('marketing.zoo.audience.subtitle')}
            </p>
          </div>

          <div className="max-w-lg mx-auto grid grid-cols-2 gap-3 mb-8">
            <Stat value={stats.totalUsers} label={t('marketing.zoo.audience.statsExplorers')} prefix="+" />
            <Stat value={stats.totalCaptures} label={t('marketing.zoo.audience.statsCaptures')} prefix="+" />
          </div>

          <div className="flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0">
            {audienceItems.map((item, i) => {
              const rot = ['-rotate-1', 'rotate-1', '-rotate-1', 'rotate-1'][i % 4];
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 w-[85%] sm:w-auto snap-start flex items-start gap-4 p-5 rounded-2xl bg-card border-2 border-dashed border-foreground/15 shadow-card ${rot} hover:rotate-0 transition-transform`}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-base leading-snug">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 font-body leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LE PRINCIPE DE FAUNEX — naturalist stamps */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
        <div className="relative max-w-lg sm:max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl">
              <HighlightTitle
                value={t('marketing.zoo.principle.title')}
                highlight={t('marketing.zoo.principle.titleHighlight')}
              />
            </h2>
            <p className="mt-2 text-muted-foreground text-sm font-body max-w-md mx-auto">
              {t('marketing.zoo.principle.subtitle')}
            </p>
          </div>

          <div className="flex sm:grid sm:grid-cols-3 gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0">
            {principleSteps.map((step, i) => (
              <div
                key={i}
                className={`group flex-shrink-0 w-[80%] sm:w-auto snap-start relative ${step.rot} hover:rotate-0 transition-transform duration-300`}
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-5 bg-amber/40 border-x border-dashed border-amber-dark/30 rotate-[-3deg] shadow-sm" />
                <div className="relative rounded-xl bg-card border-2 border-dashed border-foreground/15 p-6 shadow-card">
                  <div className={`absolute inset-2 rounded-lg bg-gradient-to-br ${step.tint} pointer-events-none opacity-60`} />
                  <div className="relative">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="font-editorial italic font-black text-5xl text-foreground/15 leading-none">{step.num}</span>
                      <div className="w-11 h-11 rounded-full bg-background border-2 border-foreground/20 flex items-center justify-center shadow-sm">
                        <step.icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-display font-black text-lg">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 font-body leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP SHOWCASE */}
      <section className="overflow-hidden bg-foreground px-3 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-display font-black text-background">
              <HighlightTitle
                value={t('marketing.zoo.principle.showcaseTitle')}
                highlight={t('marketing.zoo.principle.showcaseTitleHighlight')}
              />
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-background/65 font-body">
              {t('marketing.zoo.principle.showcaseSubtitle')}
            </p>
          </div>
          <img
            src="/landing/faunex-app-mockups.webp"
            alt={t('marketing.zoo.principle.showcaseAlt')}
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        </div>
      </section>

      {/* VOTRE ZOO INTÉGRÉ À L'EXPÉRIENCE */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-30 pointer-events-none" />
        <div className="relative max-w-lg sm:max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
              <HighlightTitle
                value={t('marketing.zoo.integration.title')}
                highlight={t('marketing.zoo.integration.titleHighlight')}
              />
            </h2>
            <p className="mt-3 text-muted-foreground text-sm font-body max-w-md mx-auto">
              {t('marketing.zoo.integration.subtitle')}
            </p>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0">
            {integrationItems.map((item, i) => {
              const rot = ['rotate-1', '-rotate-1', 'rotate-1', '-rotate-1'][i % 4];
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 w-[85%] sm:w-auto snap-start flex items-start gap-4 p-5 rounded-2xl bg-card border-2 border-dashed border-foreground/15 shadow-card ${rot} hover:rotate-0 transition-transform`}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-amber/15 ring-2 ring-amber/30 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-base leading-snug">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 font-body leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* INTÉGREZ VOTRE ÉTABLISSEMENT — onboarding steps */}
      <section className="relative px-5 py-16 bg-gradient-to-b from-background via-muted/20 to-background overflow-hidden">
        <div className="relative max-w-lg sm:max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl">
              <HighlightTitle
                value={t('marketing.zoo.onboarding.title')}
                highlight={t('marketing.zoo.onboarding.titleHighlight')}
              />
            </h2>
          </div>

          <div className="flex sm:grid sm:grid-cols-3 gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0">
            {onboardingSteps.map((step, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[80%] sm:w-auto snap-start relative -rotate-1 hover:rotate-0 transition-transform duration-300"
              >
                <div className="relative rounded-xl bg-card border-2 border-dashed border-foreground/15 p-6 shadow-card">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-editorial italic font-black text-5xl text-foreground/15 leading-none">{step.num}</span>
                    <div className="w-11 h-11 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-display font-black text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 font-body leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
            {(['reassurance1', 'reassurance2', 'reassurance3'] as const).map((key) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground font-display">
                <Check className="w-3.5 h-3.5 text-primary" /> {t(`marketing.zoo.onboarding.${key}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-14 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
            <HighlightTitle
              value={t('marketing.zoo.faq.title')}
              highlight={t('marketing.zoo.faq.titleHighlight')}
            />
          </h2>
        </div>
        <div className="space-y-3">
          {faq.map((f, i) => (
            <details key={i} className="group rounded-2xl bg-card border border-border overflow-hidden">
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 font-display font-bold text-sm">
                <span>{f.q}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 flex-shrink-0" />
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground font-body leading-relaxed">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 py-14">
        <div className="relative max-w-md mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 text-center overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <Sparkles className="w-8 h-8 text-primary-foreground mx-auto mb-3" />
            <h2 className="text-3xl sm:text-4xl font-display font-black text-primary-foreground mb-2 leading-tight">
              <HighlightTitle
                value={t('marketing.zoo.finalCta.title')}
                highlight={t('marketing.zoo.finalCta.titleHighlight')}
              />
            </h2>
            <p className="text-sm text-primary-foreground/90 font-body mb-6">
              {t('marketing.zoo.finalCta.subtitle')}
            </p>
            <a href={contactHref} className="block">
              <Button
                size="lg"
                variant="secondary"
                className="font-display font-bold gap-2 text-base px-7 py-6 rounded-2xl bg-background text-primary hover:bg-background/90 hover:scale-[1.02] transition-transform w-full"
              >
                <Mail className="w-5 h-5" />
                {t('marketing.zoo.finalCta.cta')}
              </Button>
            </a>
            <p className="text-[11px] text-primary-foreground/80 font-display mt-3">
              {t('marketing.zoo.finalCta.note')}
            </p>
          </div>
        </div>
      </section>

      <Footer />

      {/* STICKY MOBILE CTA */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-3 bg-background/95 backdrop-blur-lg border-t border-border transition-all duration-300 sm:hidden ${
          showStickyCta ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <a href={contactHref} className="block">
          <Button
            size="lg"
            className="w-full font-display font-bold gap-2 text-base py-6 rounded-2xl shadow-[0_8px_24px_-8px_hsla(150,55%,30%,0.6)]"
          >
            <Mail className="w-5 h-5" />
            {t('marketing.zoo.hero.cta')}
          </Button>
        </a>
      </div>
    </main>
  );
};

export default ZooLandingPage;
