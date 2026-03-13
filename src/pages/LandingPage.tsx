import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, BookOpen, MapPin, Users, ChevronRight } from 'lucide-react';

const features = [
  {
    icon: Camera,
    title: 'Photographie',
    desc: 'Prends en photo un animal que tu croises lors de tes balades.',
  },
  {
    icon: BookOpen,
    title: 'Identification IA',
    desc: "L'IA identifie l'espèce en quelques secondes : nom, habitat, rareté…",
  },
  {
    icon: MapPin,
    title: 'Géolocalisation',
    desc: 'Découvre quelles espèces vivent autour de toi grâce à la carte.',
  },
  {
    icon: Users,
    title: 'Communauté',
    desc: 'Partage tes découvertes et explore les collections de tes amis.',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <img src="/pwa-icon-512.png" alt="Faunex" className="w-20 h-20 mb-4 relative z-10" />
        <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight relative z-10">
          Faunex
        </h1>
        <p className="mt-3 text-lg sm:text-xl text-muted-foreground max-w-md font-body relative z-10">
          Photographie, identifie et collectionne la faune autour de toi. Chaque sortie devient une aventure&nbsp;🌿
        </p>
        <div className="mt-8 flex gap-3 relative z-10">
          <Button
            size="lg"
            className="font-display font-semibold gap-2 text-base px-6"
            onClick={() => navigate('/capture')}
          >
            Capturer un animal <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="font-display font-semibold text-base px-6"
            onClick={() => navigate('/auth')}
          >
            Se connecter
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-16 max-w-lg mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-8">Comment ça marche&nbsp;?</h2>
        <div className="grid gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl bg-card border border-border p-5 shadow-card"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 font-body">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Preview cards */}
      <section className="px-6 pb-16 max-w-lg mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-2">+1 000 espèces à découvrir</h2>
        <p className="text-center text-muted-foreground text-sm mb-6 font-body">
          Mammifères, oiseaux, reptiles, amphibiens, insectes…
        </p>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory scrollbar-hide">
          {[
            { img: '/images/fox.jpg', name: 'Renard roux', status: 'Préoccupation mineure' },
            { img: '/images/kingfisher.jpg', name: 'Martin-pêcheur', status: 'Préoccupation mineure' },
            { img: '/images/owl.jpg', name: 'Harfang des neiges', status: 'Vulnérable' },
            { img: '/images/wolf.jpg', name: 'Loup gris', status: 'Protégé en Europe' },
          ].map((a, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 snap-center rounded-xl overflow-hidden border border-border bg-card shadow-card"
            >
              <img src={a.img} alt={a.name} className="w-full h-28 object-cover" loading="lazy" />
              <div className="p-2.5">
                <p className="font-display font-semibold text-sm truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground font-body">{a.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20 text-center">
        <div className="max-w-md mx-auto rounded-2xl bg-primary/5 border border-primary/15 p-8">
          <p className="text-xl font-display font-bold mb-2">Prêt à explorer&nbsp;?</p>
          <p className="text-sm text-muted-foreground font-body mb-5">
            Gratuit, sans pub, 100 % indépendant.
          </p>
          <Button
            size="lg"
            className="font-display font-semibold gap-2 text-base px-6"
            onClick={() => navigate('/auth')}
          >
            Créer mon compte <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
