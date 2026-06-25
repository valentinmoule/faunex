import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import { guides, useCases, type Article } from '@/content/articles';

const ArticleCard = ({ article }: { article: Article }) => (
  <Link
    to={`/${article.type === 'guide' ? 'guides' : 'fonctionnalites'}/${article.slug}`}
    className="block group rounded-2xl bg-card border border-border p-5 hover:border-primary/50 transition-colors"
  >
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
        {article.category}
      </span>
      <span className="text-[11px] text-muted-foreground font-display">
        {article.readingMinutes} min de lecture
      </span>
    </div>
    <h2 className="text-lg font-display font-bold leading-snug mb-2 group-hover:text-primary transition-colors">
      {article.title}
    </h2>
    <p className="text-sm text-muted-foreground font-body line-clamp-2">{article.description}</p>
    <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-display font-semibold">
      Lire <ChevronRight className="w-3 h-3" />
    </div>
  </Link>
);

const ContentIndexPage = ({ type }: { type: 'guide' | 'usecase' }) => {
  const isGuides = type === 'guide';
  const items = isGuides ? guides : useCases;
  const path = isGuides ? '/guides' : '/fonctionnalites';
  const title = isGuides
    ? 'Guides nature — Faunex'
    : 'Cas d\'usage de l\'app Faunex';
  const description = isGuides
    ? "Guides pour reconnaître les animaux, observer la faune et collectionner ses rencontres au quotidien."
    : "Comment Faunex transforme tes balades : reconnaissance IA, collection, observations en famille.";
  const heading = isGuides ? 'Guides nature' : 'Cas d\'usage';
  const intro = isGuides
    ? "Astuces et fiches pour mieux observer, identifier et comprendre la faune autour de toi."
    : "Découvre comment Faunex t'aide à transformer chaque sortie en aventure naturaliste.";

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`https://faunex.fr${path}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://faunex.fr${path}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: `https://faunex.fr${path}`,
        })}</script>
      </Helmet>

      <header className="px-5 pt-6 pb-4 max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground font-display hover:text-primary mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> Retour à l'accueil
        </Link>
        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight">{heading}</h1>
        <p className="mt-2 text-muted-foreground font-body">{intro}</p>
      </header>

      <section className="px-5 max-w-2xl mx-auto grid gap-3">
        {items.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </section>

      <section className="px-5 mt-12 max-w-2xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
          <h2 className="text-xl font-display font-black text-primary-foreground mb-2">
            Prêt à collectionner la faune ?
          </h2>
          <p className="text-sm text-primary-foreground/90 font-body mb-4">
            Faunex est gratuit, sans pub, et fonctionne directement dans ton navigateur.
          </p>
          <Button asChild size="lg" variant="secondary" className="font-display font-bold rounded-2xl bg-background text-primary hover:bg-background/90">
            <Link to="/auth?mode=signup">Créer mon compte gratuit</Link>
          </Button>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default ContentIndexPage;
