import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Brain, Trophy, ChevronRight, Check, Sparkles, MapPin, Users } from 'lucide-react';
import HolographicCard from '@/components/HolographicCard';
import { supabase } from '@/integrations/supabase/client';
import type { Rarity } from '@/data/mockData';

interface Stats {
  totalUsers: number;
  totalCaptures: number;
  totalSpecies: number;
  totalRegions: number;
}

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
  epic: 'bg-rarity-epic/15 text-rarity-epic',
  mythic: 'bg-rarity-mythic/15 text-rarity-mythic',
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
    q: "C'est vraiment gratuit ?",
    a: 'Oui, 100% gratuit. Pas de pub, pas d\'abonnement caché.',
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

const Stat = ({ value, label }: { value: number; label: string }) => {
  const { ref, value: animated } = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-2xl sm:text-3xl font-display font-black text-primary tabular-nums">
        <span ref={ref}>{animated.toLocaleString('fr-FR')}</span>
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
    totalUsers: 250,
    totalCaptures: 1200,
    totalSpecies: 180,
    totalRegions: 24,
  });
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    document.title = 'Faunex — Identifie & collectionne la faune sauvage';

    // Update meta description
    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    setMeta(
      'description',
      'Photographie un animal, l\'IA l\'identifie en 3s. Collectionne +1000 espèces autour de toi. Gratuit, sans pub.'
    );
    setMeta('og:title', 'Faunex — Transforme tes balades en chasse aux trésors', 'property');
    setMeta(
      'og:description',
      'Photographie un animal, l\'IA l\'identifie en 3s. Collectionne +1000 espèces autour de toi.',
      'property'
    );

    // Canonical
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement('link');
      canon.setAttribute('rel', 'canonical');
      document.head.appendChild(canon);
    }
    canon.setAttribute('href', 'https://faunex.fr/');

    // JSON-LD
    const ldId = 'faunex-jsonld';
    document.getElementById(ldId)?.remove();
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = ldId;
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'Faunex',
      operatingSystem: 'Web, iOS, Android',
      applicationCategory: 'LifestyleApplication',
      description:
        "Identifie et collectionne la faune sauvage autour de toi grâce à l'IA.",
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    });
    document.head.appendChild(ld);
  }, []);

  // Fetch stats
  useEffect(() => {
    supabase.functions.invoke('public-stats').then(({ data }) => {
      if (data && typeof data === 'object') {
        setStats((prev) => ({ ...prev, ...(data as Stats) }));
      }
    });
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

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden pb-20">
      {/* HERO */}
      <section className="relative px-5 pt-10 pb-14 sm:pt-14">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background pointer-events-none" />
        <div className="absolute top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-amber/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-display font-semibold mb-5">
            <Sparkles className="w-3 h-3" />
            <span>Nouveau · Identification IA en 3 secondes</span>
          </div>

          <img src="/pwa-icon-512.png" alt="Logo Faunex" className="w-14 h-14 mx-auto mb-3" />

          <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight leading-[1.05]">
            Transforme chaque balade en{' '}
            <span className="text-primary">chasse aux trésors</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground font-body max-w-md mx-auto">
            Photographie un animal, l'IA l'identifie, tu collectionnes sa carte.
            <strong className="text-foreground font-semibold"> +1000 espèces</strong> à découvrir près de chez toi.
          </p>

          <div className="mt-7 flex flex-col items-center gap-2">
            <Button
              size="lg"
              className="font-display font-bold gap-2 text-base px-7 py-6 rounded-2xl shadow-[0_8px_24px_-8px_hsla(150,55%,30%,0.5)] hover:scale-[1.02] transition-transform w-full sm:w-auto"
              onClick={() => handleCta('hero')}
            >
              Créer mon compte gratuit <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-display mt-1">
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Gratuit</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Sans pub</span>
              <span className="flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> 30 secondes</span>
            </div>
          </div>

        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="px-5 py-8 border-y border-border/50 bg-muted/30">
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-3">
          <Stat value={stats.totalUsers} label="Explorateurs" />
          <Stat value={stats.totalCaptures} label="Captures" />
          <Stat value={stats.totalSpecies} label="Espèces" />
          <Stat value={stats.totalRegions} label="Régions" />
        </div>
      </section>

      {/* HOW IT WORKS — 3 steps */}
      <section className="px-5 py-14 max-w-lg mx-auto">
        <h2 className="text-2xl sm:text-3xl font-display font-black text-center mb-2">
          3 étapes, c'est tout
        </h2>
        <p className="text-center text-muted-foreground text-sm mb-8 font-body">
          De la photo à la carte collectionnée, en moins de 10 secondes.
        </p>

        <div className="space-y-4">
          {[
            { icon: Camera, num: '1', title: 'Photographie', desc: 'Prends en photo un animal que tu croises lors de tes balades.', color: 'primary' },
            { icon: Brain, num: '2', title: "L'IA identifie", desc: "Espèce, habitat, régime, anecdotes : tout en 3 secondes.", color: 'amber' },
            { icon: Trophy, num: '3', title: 'Collectionne', desc: "L'animal devient une carte unique avec sa rareté.", color: 'rarity-epic' },
          ].map((step, i) => (
            <div
              key={i}
              className="relative flex items-start gap-4 rounded-2xl bg-card border border-border p-5 shadow-card"
            >
              <div className="flex-shrink-0 relative">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-display font-black flex items-center justify-center">
                  {step.num}
                </span>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-display font-bold text-base">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 font-body leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOLO CARDS SHOWCASE */}
      <section className="px-5 py-14 bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-display font-black text-center mb-2">
            Collectionne tes rencontres
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-8 font-body">
            4 niveaux de rareté, du commun au mythique.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {heroCards.map((card) => (
              <div key={card.name} className="rounded-2xl overflow-hidden">
                <HolographicCard rarity={card.rarity} disableAutoShimmer>
                  <div className="rounded-2xl overflow-hidden bg-card border border-border">
                    <img
                      src={card.img}
                      alt={`${card.name} — rareté ${card.label}`}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    <div className="p-2.5 bg-card">
                      <p className="font-display font-bold text-xs text-foreground truncate">{card.name}</p>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-display font-bold uppercase tracking-wider ${rarityChip[card.rarity]}`}>
                        {card.label}
                      </span>
                    </div>
                  </div>
                </HolographicCard>
              </div>
            ))}
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

      {/* BENEFITS */}
      <section className="px-5 py-14 max-w-lg mx-auto">
        <h2 className="text-2xl sm:text-3xl font-display font-black text-center mb-8">
          Pourquoi tu vas adorer
        </h2>
        <div className="space-y-3">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-sm">{b.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 font-body leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-14 max-w-lg mx-auto">
        <h2 className="text-2xl sm:text-3xl font-display font-black text-center mb-8">
          Questions fréquentes
        </h2>
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
            <h2 className="text-2xl sm:text-3xl font-display font-black text-primary-foreground mb-2">
              Rejoins l'aventure
            </h2>
            <p className="text-sm text-primary-foreground/90 font-body mb-6">
              Crée ton compte en 30 secondes et commence à collectionner.
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
