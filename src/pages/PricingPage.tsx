import { ArrowLeft, Check, Crown, Infinity as InfinityIcon, MapPin, NotebookPen, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageHeader } from '@/components/PageHeader';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const FREE_FEATURES = [
  '4 captures par jour',
  'Identification par IA',
  'Bestiaire et collection de cartes',
  'Fonctions sociales (abonnements, feed)',
];

const PREMIUM_FEATURES = [
  { icon: InfinityIcon, title: 'Captures illimitées', description: 'Plus de limite de 4 captures par jour.' },
  { icon: Sparkles, title: 'Modèle de modération plus performant', description: 'Une identification plus fine et plus rapide de tes espèces.' },
  { icon: MapPin, title: 'Localisation des animaux autour de toi', description: 'Repère les espèces présentes près de ta position.' },
  { icon: NotebookPen, title: 'Notes sur tes captures', description: 'Garde tes observations de terrain avec chaque carte.' },
  { icon: Crown, title: "Plein d'autres choses à venir…", description: 'Les prochaines nouveautés arrivent en priorité chez les abonnés.' },
];

const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Tarifs — Faunex Premium à 1,99 €/mois</title>
        <meta name="description" content="Faunex est gratuit avec 4 captures par jour. Faunex Premium coûte 1,99 € par mois : captures illimitées, identification plus fine, localisation et notes. Sans engagement." />
        <link rel="canonical" href="https://faunex.fr/tarifs" />
        <meta property="og:url" content="https://faunex.fr/tarifs" />
        <meta property="og:title" content="Tarifs — Faunex Premium à 1,99 €/mois" />
      </Helmet>

      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label="Retour à la page précédente" className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Tarifs</h1>
        </div>
      </PageHeader>

      <div className="max-w-2xl mx-auto px-5 pt-6 space-y-6">
        <p className="text-sm text-muted-foreground font-body">
          Faunex est édité par <strong>Faunex</strong> (Valentin Moulay). Les abonnements sont vendus et
          facturés par notre revendeur Paddle.com, Merchant of Record de toutes nos commandes.
        </p>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-foreground">Gratuit</h2>
          <div className="mt-2 flex items-end gap-1.5">
            <span className="font-display text-3xl font-bold text-foreground">0 €</span>
            <span className="pb-1 text-sm text-muted-foreground">/ mois</span>
          </div>
          <ul className="mt-4 space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground/80 font-body">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 shadow-sm">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Crown className="h-3.5 w-3.5" /> Faunex Premium
          </span>
          <div className="relative mt-3 flex items-end gap-1.5">
            <span className="font-display text-4xl font-bold text-foreground">1,99 €</span>
            <span className="pb-1 text-sm text-muted-foreground">/ mois</span>
          </div>
          <p className="relative mt-1 text-xs text-muted-foreground font-body">
            Facturation récurrente mensuelle, TVA incluse le cas échéant. Sans engagement, annulable à tout moment.
          </p>

          <ul className="relative mt-5 space-y-3">
            {PREMIUM_FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground font-body">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <Button asChild className="relative mt-6 h-12 w-full rounded-2xl text-base font-semibold">
            <Link to="/premium">S'abonner pour 1,99 €/mois</Link>
          </Button>
          <p className="relative mt-2 text-center text-[11px] text-muted-foreground font-body">
            Un compte Faunex est nécessaire pour finaliser l'abonnement.
          </p>
        </section>

        <p className="text-sm text-muted-foreground font-body">
          Voir aussi notre{' '}
          <Link to="/remboursement" className="text-primary underline">politique de remboursement</Link> et nos{' '}
          <Link to="/legal" className="text-primary underline">conditions générales</Link>.
        </p>
      </div>

      <Footer />
    </main>
  );
};

export default PricingPage;
