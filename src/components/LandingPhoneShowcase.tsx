import { Camera, Sparkles, Search, Trophy, Zap, MapPin } from 'lucide-react';
import PhoneMockup from './PhoneMockup';
import HolographicCard from './HolographicCard';

/**
 * Three phone mockups showcasing the app: Capture flow, Bestiary grid, Card reveal.
 */
const LandingPhoneShowcase = () => {
  return (
    <section className="px-5 py-16 bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
            L'app dans ta <span className="font-editorial italic text-primary">poche</span>.
          </h2>
          <p className="mt-2 text-muted-foreground text-sm font-body max-w-md mx-auto">
            De la photo à la carte holographique, en quelques secondes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 items-start">
          {/* PHONE 1 — Capture */}
          <div className="flex flex-col items-center">
            <PhoneMockup className="w-[210px] sm:w-[200px] sm:rotate-[-3deg] sm:translate-y-4">
              <div className="relative h-full w-full bg-black">
                <img
                  src="/landing/bluetit.jpg"
                  alt="Capture — Mésange bleue"
                  className="absolute inset-0 w-full h-full object-cover opacity-90"
                  loading="lazy"
                />
                {/* Camera reticle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-2xl border-2 border-white/80 shadow-[0_0_0_2000px_rgba(0,0,0,0.25)]">
                    <div className="w-full h-full relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-lg -translate-x-0.5 -translate-y-0.5" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-lg translate-x-0.5 -translate-y-0.5" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-lg -translate-x-0.5 translate-y-0.5" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-lg translate-x-0.5 translate-y-0.5" />
                    </div>
                  </div>
                </div>
                {/* Top label */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-display font-bold text-white">IA prête</span>
                </div>
                {/* Shutter */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                  <div className="w-11 h-11 rounded-full ring-2 ring-neutral-900" />
                </div>
              </div>
            </PhoneMockup>
            <div className="mt-5 text-center max-w-[200px]">
              <div className="inline-flex items-center gap-1.5 text-primary mb-1">
                <Camera className="w-4 h-4" />
                <span className="text-[11px] font-display font-bold uppercase tracking-wider">Étape 1</span>
              </div>
              <p className="text-sm font-display font-bold">Photographie</p>
              <p className="text-xs text-muted-foreground font-body mt-1">Vise, capture. L'IA fait le reste.</p>
            </div>
          </div>

          {/* PHONE 2 — Bestiary */}
          <div className="flex flex-col items-center sm:-translate-y-2">
            <PhoneMockup className="w-[210px] sm:w-[200px]">
              <div className="h-full w-full bg-background flex flex-col">
                {/* Header */}
                <div className="px-3 pt-3 pb-2">
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Mon Faunex</p>
                  <p className="text-base font-display font-black leading-tight">Bestiaire</p>
                  <div className="mt-2 flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5">
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-body">Rechercher…</span>
                  </div>
                </div>
                {/* Grid */}
                <div className="flex-1 px-3 pb-3 grid grid-cols-3 gap-1.5 content-start">
                  {[
                    { img: '/landing/ladybug.jpg', ring: 'ring-muted' },
                    { img: '/landing/bluetit.jpg', ring: 'ring-rarity-rare/60' },
                    { img: '/landing/squirrel.jpg', ring: 'ring-rarity-silver/60' },
                    { img: '/landing/reddeer.jpg', ring: 'ring-rarity-gold/70' },
                    { img: '/landing/ladybug.jpg', ring: 'ring-muted' },
                    { img: '/landing/bluetit.jpg', ring: 'ring-rarity-rare/60' },
                  ].map((c, i) => (
                    <div key={i} className={`aspect-square rounded-md overflow-hidden ring-2 ${c.ring}`}>
                      <img src={c.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={`s-${i}`} className="aspect-square rounded-md bg-muted/60 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                    </div>
                  ))}
                </div>
                {/* Stat strip */}
                <div className="px-3 pb-3">
                  <div className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-display font-bold text-primary">Niveau 7</span>
                    <span className="text-[10px] font-display text-primary/80">42 captures</span>
                  </div>
                </div>
              </div>
            </PhoneMockup>
            <div className="mt-5 text-center max-w-[200px]">
              <div className="inline-flex items-center gap-1.5 text-primary mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-[11px] font-display font-bold uppercase tracking-wider">Étape 2</span>
              </div>
              <p className="text-sm font-display font-bold">Collectionne</p>
              <p className="text-xs text-muted-foreground font-body mt-1">Remplis ton bestiaire, monte en niveau.</p>
            </div>
          </div>

          {/* PHONE 3 — Card reveal */}
          <div className="flex flex-col items-center">
            <PhoneMockup className="w-[210px] sm:w-[200px] sm:rotate-[3deg] sm:translate-y-4">
              <div className="relative h-full w-full bg-gradient-to-b from-rarity-gold/20 via-background to-background flex flex-col items-center justify-center p-4">
                {/* Sparkles */}
                <div className="absolute top-6 left-6 text-rarity-gold animate-pulse">
                  <Sparkles className="w-3 h-3" />
                </div>
                <div className="absolute top-12 right-8 text-rarity-gold animate-pulse" style={{ animationDelay: '300ms' }}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="absolute bottom-20 left-8 text-rarity-gold animate-pulse" style={{ animationDelay: '600ms' }}>
                  <Sparkles className="w-3 h-3" />
                </div>

                <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-rarity-gold mb-2">
                  Mythique
                </p>

                <div className="w-32">
                  <HolographicCard rarity="mythic">
                    <div className="rounded-xl overflow-hidden bg-card border border-border">
                      <img src="/landing/reddeer.jpg" alt="Cerf élaphe" className="w-full aspect-square object-cover" loading="lazy" />
                      <div className="p-1.5 bg-card">
                        <p className="font-display font-bold text-[10px] truncate">Cerf élaphe</p>
                        <p className="text-[8px] text-rarity-gold font-display font-bold uppercase tracking-wider">Mythique</p>
                      </div>
                    </div>
                  </HolographicCard>
                </div>

                <div className="mt-3 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 border border-primary/30">
                  <Trophy className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-display font-bold text-primary">+250 XP</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[9px] text-muted-foreground font-body">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>Forêt de Fontainebleau</span>
                </div>
              </div>
            </PhoneMockup>
            <div className="mt-5 text-center max-w-[200px]">
              <div className="inline-flex items-center gap-1.5 text-primary mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-[11px] font-display font-bold uppercase tracking-wider">Étape 3</span>
              </div>
              <p className="text-sm font-display font-bold">Révèle ta carte</p>
              <p className="text-xs text-muted-foreground font-body mt-1">Animation holographique selon la rareté.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPhoneShowcase;
