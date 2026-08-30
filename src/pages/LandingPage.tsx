import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Camera, Brain, Trophy, ChevronRight, Check, Sparkles, MapPin, Users, BookOpen } from 'lucide-react';
import Footer from '@/components/Footer';
import HolographicCard from '@/components/HolographicCard';
import LandingPhoneShowcase from '@/components/LandingPhoneShowcase';
import { supabase } from '@/integrations/supabase/client';
import { guides, useCases } from '@/content/articles';
import type { Rarity } from '@/data/mockData';

interface Stats {
  totalUsers: number;
  totalCaptures: number;
}

interface RecentCapture {
  animal_name: string;
  created_at: string;
  rarity: string;
}

const rarityToDot: Record<string, string> = {
  common: 'bg-rarity-common',
  rare: 'bg-rarity-rare',
  epic: 'bg-rarity-silver',
  mythic: 'bg-rarity-gold',
};

// Real wildlife photos hosted locally (Wikimedia Commons originals)
const heroCards: { img: string; name: string; rarity: Rarity; label: string }[] = [
  { img: '/landing/ladybug.jpg', name: 'Coccinelle', rarity: 'common', label: 'Commun' },
  { img: '/landing/bluetit.jpg', name: 'Mésange bleue', rarity: 'rare', label: 'Rare' },
  { img: '/landing/squirrel.jpg', name: 'Écureuil roux', rarity: 'epic', label: 'Épique' },
  { img: '/landing/reddeer.jpg', name: 'Cerf élaphe', rarity: 'mythic', label: 'Mythique' },
];

const rarityChip: Record<Rarity, string> = {
  common: 'bg-muted text-muted-foreground',
  rare: 'bg-rarity-rare/15 text-rarity-rare',
  epic: 'bg-rarity-silver/15 text-rarity-silver',
  mythic: 'bg-rarity-gold/15 text-rarity-gold',
};

const benefits = [
  {
    icon: Brain,
    title: "Plus jamais « c'est quoi cet oiseau ? »",
    desc: "L'IA identifie l'espèce en 3 secondes : nom, habitat, anecdotes.",
  },
  {
    icon: MapPin,
    title: 'Découvre la faune cachée de ton quartier',
    desc: 'Une carte des espèces actives autour de toi, en temps réel.',
  },
  {
    icon: Trophy,
    title: 'Collectionne comme dans Pokémon',
    desc: 'Chaque animal devient une carte unique, avec rareté et effets.',
  },
  {
    icon: Users,
    title: 'Compare avec tes amis',
    desc: 'Suis tes proches, partage tes trouvailles, monte au classement.',
  },
];

const faq = [
  {
    q: 'Combien ça coûte ?',
    a: "Faunex est gratuit avec 4 captures par jour, sans publicité. L'abonnement facultatif Faunex Premium coûte 2,40 €/mois ou 24 €/an (2 mois offerts) (captures illimitées, détection et modération plus performantes, localisation, notes), sans engagement et remboursable 30 jours. Détails sur la page Tarifs.",
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: 'Oui. Tes captures restent privées par défaut, et nous ne revendons jamais tes données.',
  },
  {
    q: 'Ça fonctionne sur iPhone et Android ?',
    a: "Oui. Faunex est une app web installable en 1 clic depuis ton navigateur, sans passer par les stores.",
  },
  {
    q: "Et si l'IA se trompe ?",
    a: 'Tu peux corriger ou soumettre l\'animal pour validation par notre équipe. Précision moyenne : >90%.',
  },
];

// Count-up hook with intersection observer
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

const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 2000,
    totalCaptures: 15000,
  });
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>([]);

  // Per-route head is managed via <Helmet> below.

  // Fetch stats
  useEffect(() => {
    supabase.functions.invoke('public-stats').then(({ data }) => {
      if (data && typeof data === 'object') {
        setStats((prev) => ({ ...prev, ...(data as Stats) }));
      }
    });
  }, []);

  // Fetch recent approved captures for the live ticker (public RPC, bypasses RLS safely)
  useEffect(() => {
    const load = () =>
      supabase.rpc('get_public_recent_captures', { p_limit: 14 }).then(({ data, error }) => {
        if (error) {
          console.error('[recent-captures]', error);
          return;
        }
        setRecentCaptures((data as RecentCapture[]) || []);
      });
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // Sticky CTA after 30% scroll
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setShowStickyCta(scrolled > 0.18 && scrolled < 0.92);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCta = (location: string) => {
    console.log('[landing-cta]', location);
    navigate('/auth?mode=signup');
  };

  const handleLogin = () => {
    console.log('[landing-cta]', 'login');
    navigate('/auth?mode=login');
  };

  const formatRelativeTime = (iso: string) => {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));
    if (diffSec < 60) return 'capturé à l\'instant';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `capturé il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `capturé il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `capturé il y a ${diffD}j`;
    return 'capturé récemment';
  };

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden pb-20">
      <Helmet>
        <title>Faunex — Identifie & collectionne la faune sauvage</title>
        <meta name="description" content="Photographie un animal, l'IA l'identifie en 3s. Collectionne des cartes de faune autour de toi, du commun au mythique. Gratuit, sans pub." />
        <link rel="canonical" href="https://faunex.fr/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://faunex.fr/" />
        <meta property="og:title" content="Faunex — Transforme tes balades en chasse aux trésors" />
        <meta property="og:description" content="Photographie un animal, l'IA l'identifie en 3s. Collectionne des cartes de faune autour de toi, du commun au mythique." />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'MobileApplication',
          name: 'Faunex',
          operatingSystem: 'Web, iOS, Android',
          applicationCategory: 'LifestyleApplication',
          description: "Identifie et collectionne la faune sauvage autour de toi grâce à l'IA.",
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        })}</script>
      </Helmet>
      {/* HERO */}
      <section className="relative px-5 pt-10 pb-14 sm:pt-14 overflow-hidden">
        {/* Topographic dotted layer */}
        <div className="absolute inset-0 bg-topo opacity-60 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute top-20 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-44 -left-24 w-72 h-72 bg-amber/15 rounded-full blur-3xl pointer-events-none" />

        {/* Field-notebook coordinates corner mark */}
        <div className="hidden sm:block absolute top-6 left-6 font-handwritten text-sm text-muted-foreground/70 -rotate-3 pointer-events-none select-none">
          N&nbsp;48°51' · E&nbsp;2°21'
        </div>
        <div className="hidden sm:block absolute top-6 right-6 font-handwritten text-sm text-muted-foreground/70 rotate-2 pointer-events-none select-none">
          Carnet&nbsp;n°&nbsp;01
        </div>

        <div className="relative z-10 max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-display font-semibold mb-5">
            <Sparkles className="w-3 h-3" />
            <span>Le jeu de cartes grandeur nature</span>
          </div>

          <img src="/pwa-icon-512.png" alt="Logo Faunex" width="56" height="56" fetchPriority="high" className="w-14 h-14 mx-auto mb-3" />

          <h1 className="font-display font-black tracking-tight leading-[1.02] text-4xl sm:text-6xl">
            <span className="block">Attrape-les</span>
            <span className="relative inline-block">
              <span className="font-editorial italic font-black text-primary">vraiment tous</span>
              {/* Hand-drawn underline */}
              <svg
                aria-hidden="true"
                viewBox="0 0 220 14"
                className="absolute -bottom-2 left-0 w-full h-3 text-amber"
                fill="none"
              >
                <path
                  d="M2 9 C 40 2, 90 14, 130 6 S 200 4, 218 8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="text-foreground">.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground font-body max-w-md mx-auto">
            Une coccinelle sur ton balcon, un cerf en forêt, un faucon en ville — chaque rencontre devient une carte dans ton bestiaire.
          </p>


          <div className="mt-8 flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="font-display font-bold gap-2 text-base px-8 py-6 rounded-2xl shadow-[0_10px_28px_-8px_hsla(150,55%,30%,0.55)] hover:scale-[1.02] hover:rotate-[-0.5deg] transition-all w-full sm:w-auto"
              onClick={() => handleCta('hero')}
            >
              Créer mon compte gratuit <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-display mt-1">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Gratuit</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Sans pub</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> En français</span>
            </div>
            <button
              type="button"
              onClick={handleLogin}
              className="mt-3 text-sm text-muted-foreground font-display hover:text-primary transition-colors"
            >
              Déjà un compte ? <span className="text-primary font-semibold underline underline-offset-2">Se connecter</span>
            </button>
          </div>

        </div>
      </section>

      {/* LIVE CAPTURES MARQUEE */}
      <section className="relative border-y border-border/60 bg-gradient-to-b from-card to-background overflow-hidden">
        <div className="max-w-5xl mx-auto px-5 pt-4 pb-1 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rarity-rare opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rarity-rare" />
            </span>
            <span className="text-[10px] font-display font-bold tracking-[0.2em] uppercase text-foreground/80">
              En direct
            </span>
            <span className="text-[11px] font-body text-muted-foreground hidden sm:inline">
              · dernières captures de la communauté
            </span>
          </div>
          <span className="text-[10px] font-body text-muted-foreground/70 hidden sm:inline">
            mis à jour chaque minute
          </span>
        </div>
        <div
          className="relative py-3"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
          }}
        >
          <div className="flex gap-3 whitespace-nowrap animate-marquee">
            {(() => {
              const items: { name: string; label: string; r: string }[] =
                recentCaptures.length > 0
                  ? recentCaptures.map((c) => ({
                      name: c.animal_name,
                      label: formatRelativeTime(c.created_at),
                      r: c.rarity || 'common',
                    }))
                  : [
                      { name: 'Renard roux', label: 'il y a 10min', r: 'rare' },
                      { name: 'Cerf élaphe', label: 'il y a 25min', r: 'mythic' },
                      { name: 'Mésange bleue', label: 'il y a 1h', r: 'rare' },
                      { name: 'Écureuil roux', label: 'il y a 2h', r: 'epic' },
                      { name: 'Coccinelle', label: 'il y a 3h', r: 'common' },
                      { name: 'Faucon pèlerin', label: 'il y a 5h', r: 'epic' },
                      { name: 'Bouquetin', label: 'il y a 1j', r: 'mythic' },
                      { name: 'Hérisson', label: 'il y a 2j', r: 'rare' },
                    ];
              return Array.from({ length: 2 }).flatMap((_, dup) =>
                items.map((s, i) => (
                  <span
                    key={`${dup}-${i}`}
                    className="inline-flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm shadow-sm"
                  >
                    <span className={`w-2 h-2 rounded-full ${rarityToDot[s.r] || 'bg-muted-foreground'} shadow-[0_0_8px_currentColor]`} />
                    <span className="font-display font-semibold text-sm text-foreground">
                      {s.name}
                    </span>
                    <span className="font-body text-[11px] text-muted-foreground">
                      · {s.label}
                    </span>
                  </span>
                ))
              );
            })()}
          </div>
        </div>
      </section>


      {/* SOCIAL PROOF */}
      <section className="px-5 py-8 border-b border-border/50 bg-muted/30">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <Stat value={stats.totalUsers} label="Explorateurs" prefix="+" />
          <Stat value={stats.totalCaptures} label="Captures" prefix="+" />
        </div>
      </section>


      {/* PHONE MOCKUPS SHOWCASE */}
      <LandingPhoneShowcase />

      {/* HOW IT WORKS — naturalist stamps */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
        <div className="relative max-w-lg sm:max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl">
              3 gestes, <span className="font-editorial italic text-primary">c'est tout.</span>
            </h2>
            <p className="mt-2 text-muted-foreground text-sm font-body max-w-md mx-auto">
              De la photo à la carte collectionnée, en moins de 10 secondes.
            </p>
          </div>

          <div className="flex sm:grid sm:grid-cols-3 gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0">
            {[
              { icon: Camera, num: '01', title: 'Photographie', desc: 'Prends en photo un animal que tu croises lors de tes balades.', rot: '-rotate-2', tint: 'from-primary/15 to-primary/5' },
              { icon: Brain, num: '02', title: "L'IA identifie", desc: "Espèce, habitat, régime, anecdotes : tout en 3 secondes.", rot: 'rotate-1', tint: 'from-amber/20 to-amber/5' },
              { icon: Trophy, num: '03', title: 'Collectionne', desc: "L'animal devient une carte unique avec sa rareté.", rot: '-rotate-1', tint: 'from-rarity-silver/15 to-rarity-silver/5' },
            ].map((step, i) => (
              <div
                key={i}
                className={`group flex-shrink-0 w-[80%] sm:w-auto snap-start relative ${step.rot} hover:rotate-0 transition-transform duration-300`}
              >
                {/* Tape strip */}
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-5 bg-amber/40 border-x border-dashed border-amber-dark/30 rotate-[-3deg] shadow-sm" />

                {/* Stamp card */}
                <div className={`relative rounded-xl bg-card border-2 border-dashed border-foreground/15 p-6 shadow-card`}>
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
                    <div className="mt-4 pt-3 border-t border-dashed border-foreground/15 flex items-center justify-between">
                      <span className="font-handwritten text-xs text-muted-foreground">Étape {step.num.replace('0', '')}/3</span>
                      <span className="text-[10px] font-display uppercase tracking-widest text-primary">Faunex · Terrain</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* HOLO CARDS SHOWCASE */}
      <section className="px-5 py-14 bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
              Collectionne tes <span className="font-editorial italic text-primary">rencontres.</span>
            </h2>
            <p className="text-center text-muted-foreground text-sm mt-2 font-body">
              4 niveaux de rareté, du commun au mythique.
            </p>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0">
            {heroCards.map((card) => {
              const badge = {
                common: 'bg-rarity-common/20 text-rarity-common border border-rarity-common/30',
                rare: 'bg-rarity-rare/15 text-rarity-rare border border-rarity-rare/30 shadow-[0_0_8px_hsla(210,70%,55%,0.3)]',
                epic: 'bg-rarity-silver/15 text-rarity-silver border border-rarity-silver/30 shadow-[0_0_8px_hsla(270,70%,60%,0.3)]',
                mythic: 'bg-rarity-gold/15 text-rarity-gold border border-rarity-gold/30 shadow-[0_0_10px_hsla(42,85%,55%,0.4)]',
              }[card.rarity];
              return (
                <div key={card.name} className="flex-shrink-0 w-[72%] sm:w-auto snap-start rounded-2xl overflow-hidden">
                  <HolographicCard rarity={card.rarity} disableAutoShimmer>
                    <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <img
                          src={card.img}
                          alt={`${card.name} — rareté ${card.label}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
                        <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-wider backdrop-blur-md ${badge}`}>
                          {card.label}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <p className="font-display font-bold text-sm text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                            {card.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </HolographicCard>
                </div>
              );
            })}
          </div>

          {/* Rarity explanation */}
          <div className="mt-8 rounded-2xl bg-card border border-border p-5 space-y-3">
            <p className="text-xs text-muted-foreground font-body text-center mb-1">
              La rareté d'une carte dépend du <strong className="text-foreground">statut de conservation</strong> de l'espèce dans la nature.
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider ${rarityChip.common}`}>Commun</span>
                <p className="text-xs text-muted-foreground font-body flex-1">Espèces fréquentes, faciles à croiser (moineau, coccinelle…).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider ${rarityChip.rare}`}>Rare</span>
                <p className="text-xs text-muted-foreground font-body flex-1">Espèces peu communes ou discrètes, demandent de la patience.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider ${rarityChip.epic}`}>Épique</span>
                <p className="text-xs text-muted-foreground font-body flex-1">Espèces vulnérables ou en déclin, observation marquante.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider ${rarityChip.mythic}`}>Mythique</span>
                <p className="text-xs text-muted-foreground font-body flex-1">Espèces en danger critique, rencontre exceptionnelle.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS — sticker cards */}
      <section className="relative px-5 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-topo opacity-30 pointer-events-none" />
        <div className="relative max-w-lg sm:max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
              Tu vas <span className="font-editorial italic text-primary">adorer</span>.
            </h2>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-4 sm:pb-0">
            {benefits.map((b, i) => {
              const rot = ['-rotate-1', 'rotate-1', '-rotate-1', 'rotate-1'][i % 4];
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 w-[85%] sm:w-auto snap-start flex items-start gap-4 p-5 rounded-2xl bg-card border-2 border-dashed border-foreground/15 shadow-card ${rot} hover:rotate-0 transition-transform`}
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-base leading-snug">{b.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 font-body leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-14 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="mt-1 text-3xl sm:text-4xl font-display font-black">
            Questions <span className="font-editorial italic text-primary">fréquentes</span>.
          </h2>
        </div>
        <div className="space-y-3">
          {faq.map((f, i) => (
            <details
              key={i}
              className="group rounded-2xl bg-card border border-border overflow-hidden"
            >
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
              Rejoins <span className="font-editorial italic">l'aventure</span>.
            </h2>
            <p className="text-sm text-primary-foreground/90 font-body mb-6">
              Crée ton compte et commence à collectionner la faune près de chez toi.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="font-display font-bold gap-2 text-base px-7 py-6 rounded-2xl bg-background text-primary hover:bg-background/90 hover:scale-[1.02] transition-transform w-full"
              onClick={() => handleCta('final')}
            >
              Créer mon compte gratuit <ChevronRight className="w-5 h-5" />
            </Button>
            <p className="text-[11px] text-primary-foreground/80 font-display mt-3">
              Gratuit · Sans engagement · Sans pub
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT HUB — internal links for SEO */}
      <section className="px-5 py-12 border-t border-border/50 bg-muted/20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-xl font-display font-black">Apprends, explore</h2>
          </div>
          <p className="text-sm text-muted-foreground font-body mb-6">
            Nos guides nature et cas d'usage pour bien démarrer.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {[...guides.slice(0, 2), ...useCases.slice(0, 2)].map((a) => (
              <Link
                key={a.slug}
                to={`/${a.type === 'guide' ? 'guides' : 'fonctionnalites'}/${a.slug}`}
                className="block rounded-2xl bg-card border border-border p-4 hover:border-primary/50 transition-colors"
              >
                <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {a.category}
                </span>
                <p className="mt-2 text-sm font-display font-bold leading-snug">{a.title}</p>
                <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">{a.description}</p>
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-sm font-display font-semibold">
            <Link to="/guides" className="text-primary hover:underline inline-flex items-center gap-1">
              Tous les guides <ChevronRight className="w-3 h-3" />
            </Link>
            <Link to="/fonctionnalites" className="text-primary hover:underline inline-flex items-center gap-1">
              Tous les cas d'usage <ChevronRight className="w-3 h-3" />
            </Link>
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
        <Button
          size="lg"
          className="w-full font-display font-bold gap-2 text-base py-6 rounded-2xl shadow-[0_8px_24px_-8px_hsla(150,55%,30%,0.6)]"
          onClick={() => handleCta('sticky')}
        >
          Créer mon compte gratuit <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </main>
  );
};

export default LandingPage;
