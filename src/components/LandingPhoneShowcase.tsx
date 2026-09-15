import { Camera, Search, Zap, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PhoneMockup from './PhoneMockup';
import HolographicCard from './HolographicCard';

/**
 * Three phone mockups showcasing the app: Capture flow, Bestiary grid, Card reveal.
 * Premium "device photography" look — white bezels, soft floating shadows,
 * holographic reveal on a dark premium screen.
 */
const LandingPhoneShowcase = () => {
  const { t } = useTranslation();

  const StepPill = ({ n, label, light = false }: { n: number; label: string; light?: boolean }) => (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-display font-bold shadow-sm border ${
        light
          ? 'text-primary-foreground bg-primary border-primary/30 shadow-md shadow-primary/20'
          : 'text-foreground bg-background border-border'
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-display font-black ${
          light ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {n}
      </span>
      {label}
    </span>
  );

  return (
    <section className="px-5 py-16 bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
            {(() => {
              const highlight = t('marketing.phoneShowcase.titleHighlight');
              const [before, after] = t('marketing.phoneShowcase.title', { highlight: '__HL__' }).split('__HL__');
              return (
                <>
                  {before}<span className="font-editorial italic text-primary">{highlight}</span>{after}
                </>
              );
            })()}
          </h2>
          <p className="mt-2 text-muted-foreground text-sm font-body max-w-md mx-auto">
            {t('marketing.phoneShowcase.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 sm:gap-6 items-start">
          {/* PHONE 1 — Capture */}
          <div className="flex flex-col items-center">
            <PhoneMockup className="w-[240px] sm:w-[215px] sm:rotate-[-3deg] sm:translate-y-4">
              <div className="absolute inset-0">
                <img
                  src="/landing/bluetit.jpg"
                  alt={t('marketing.phoneShowcase.captureAlt')}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/40" />

                {/* Top controls */}
                <div className="absolute top-9 inset-x-4 flex items-center justify-between">
                  <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-md">
                    <span className="text-[9px] font-display font-black tracking-[0.15em] uppercase text-primary-foreground">
                      {t('marketing.phoneShowcase.aiReady')}
                    </span>
                  </div>
                </div>

                {/* Discovery card */}
                <div className="absolute bottom-28 inset-x-4">
                  <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 px-4 py-3 flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[8px] font-display font-black uppercase tracking-[0.2em] text-primary">
                        {t('marketing.phoneShowcase.discoveryLabel')}
                      </p>
                      <p className="text-sm font-display font-black text-foreground leading-tight truncate">
                        {t('marketing.phoneShowcase.bluetitName')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shutter */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                  <div className="w-16 h-16 rounded-full border-4 border-white/80 flex items-center justify-center shadow-lg">
                    <div className="w-12 h-12 rounded-full bg-white shadow-inner" />
                  </div>
                </div>
              </div>
            </PhoneMockup>
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <StepPill n={1} label={t('marketing.phoneShowcase.photograph')} />
              <p className="text-xs text-muted-foreground font-body max-w-[200px]">
                {t('marketing.phoneShowcase.photographDesc')}
              </p>
            </div>
          </div>

          {/* PHONE 2 — Bestiary */}
          <div className="flex flex-col items-center sm:-translate-y-2">
            <PhoneMockup className="w-[240px] sm:w-[215px]">
              <div className="absolute inset-0 bg-background flex flex-col">
                {/* Header */}
                <div className="px-5 pt-10 pb-4">
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-display font-black text-foreground leading-tight">
                      {t('marketing.phoneShowcase.bestiary')}
                    </p>
                    <span className="text-[11px] font-display font-bold text-primary mb-0.5">
                      {t('marketing.phoneShowcase.captures42')}
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-primary to-primary/70" />
                  </div>
                </div>
                {/* Grid */}
                <div className="flex-1 grid grid-cols-2 gap-3 px-5 content-start">
                  {[
                    { img: '/landing/ladybug.jpg' },
                    { img: '/landing/bluetit.jpg' },
                    { img: '/landing/squirrel.jpg' },
                    { img: '/landing/reddeer.jpg' },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-2xl overflow-hidden bg-card shadow-sm ring-1 ring-border"
                    >
                      <img src={c.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                  {[0, 1].map((i) => (
                    <div
                      key={`s-${i}`}
                      className="aspect-square rounded-2xl border-2 border-dashed border-border/60 bg-muted/50 flex items-center justify-center"
                    >
                      <HelpCircle className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  ))}
                </div>
                {/* Bottom hint */}
                <div className="px-5 pb-5 pt-3">
                  <div className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-body">
                      {t('marketing.phoneShowcase.search')}
                    </span>
                  </div>
                </div>
              </div>
            </PhoneMockup>
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <StepPill n={2} label={t('marketing.phoneShowcase.collect')} />
              <p className="text-xs text-muted-foreground font-body max-w-[200px]">
                {t('marketing.phoneShowcase.collectDesc')}
              </p>
            </div>
          </div>

          {/* PHONE 3 — Card reveal */}
          <div className="flex flex-col items-center">
            <PhoneMockup className="w-[240px] sm:w-[215px] sm:rotate-[3deg] sm:translate-y-4" variant="dark">
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-b from-primary/25 via-transparent to-black">
                {/* Ambient glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,197,94,0.28),transparent_70%)]" />

                {/* Sparkles */}
                <div className="absolute top-12 right-8 text-primary-foreground/90 animate-pulse">
                  <Zap className="h-2.5 w-2.5 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                </div>
                <div className="absolute bottom-24 left-7 text-primary animate-pulse" style={{ animationDelay: '400ms' }}>
                  <span className="block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(34,197,94,0.9)]" />
                </div>

                {/* Mythic card */}
                <div className="relative w-[62%]">
                  <HolographicCard rarity="special_rare">
                    <div className="relative aspect-[2.5/3.6] rounded-2xl overflow-hidden shadow-[0_0_44px_rgba(34,197,94,0.5)] ring-1 ring-white/30">
                      <img
                        src="/landing/reddeer.jpg"
                        alt={t('marketing.phoneShowcase.reddeerAlt')}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Holo shine */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-white/25 mix-blend-overlay pointer-events-none" />
                      {/* Bottom gradient */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent pt-10 px-3.5 pb-3">
                        <p className="text-[7px] font-display font-black uppercase tracking-[0.3em] text-rarity-gold">
                          {t('marketing.phoneShowcase.mythic')}
                        </p>
                        <div className="flex items-end justify-between gap-2">
                          <p className="font-display font-black text-white text-xs uppercase leading-tight">
                            {t('marketing.phoneShowcase.reddeerName')}
                          </p>
                          <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-display font-black text-primary-foreground ring-1 ring-white/30">
                            {t('marketing.phoneShowcase.xpGain')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </HolographicCard>
                </div>

                {/* Location */}
                <div className="absolute bottom-6 flex items-center gap-1 text-[9px] text-white/60 font-body">
                  <Camera className="h-2.5 w-2.5" />
                  <span>{t('marketing.phoneShowcase.location')}</span>
                </div>
              </div>
            </PhoneMockup>
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <StepPill n={3} label={t('marketing.phoneShowcase.revealCard')} light />
              <p className="text-xs text-muted-foreground font-body max-w-[200px]">
                {t('marketing.phoneShowcase.revealCardDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPhoneShowcase;
