import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Camera,
  Eye,
  MapPin,
  Moon,
  Apple,
  PawPrint,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Users,
  Bird,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import {
  fetchSpeciesPage,
  fetchSpeciesPages,
  localizedSections,
  type SpeciesSections,
} from '@/content/speciesPages';
import NotFound from './NotFound';

const SECTIONS: Array<{ key: keyof SpeciesSections; icon: typeof Eye; labelKey: string }> = [
  { key: 'recognize', icon: Eye, labelKey: 'species.sections.recognize' },
  { key: 'where', icon: MapPin, labelKey: 'species.sections.where' },
  { key: 'when', icon: Moon, labelKey: 'species.sections.when' },
  { key: 'diet', icon: Apple, labelKey: 'species.sections.diet' },
  { key: 'behaviour', icon: Bird, labelKey: 'species.sections.behaviour' },
  { key: 'tracks', icon: PawPrint, labelKey: 'species.sections.tracks' },
  { key: 'similar', icon: AlertTriangle, labelKey: 'species.sections.similar' },
  { key: 'conservation', icon: ShieldCheck, labelKey: 'species.sections.conservation' },
];

const SpeciesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: page, isLoading } = useQuery({
    queryKey: ['species-page', slug],
    queryFn: () => fetchSpeciesPage(slug as string),
    enabled: !!slug,
    staleTime: 60 * 60 * 1000,
  });

  const { data: others = [] } = useQuery({
    queryKey: ['species-pages-index'],
    queryFn: fetchSpeciesPages,
    staleTime: 60 * 60 * 1000,
  });

  const sections = useMemo(
    () => (page ? localizedSections(page, i18n.language) : {}),
    [page, i18n.language],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </main>
    );
  }

  if (!page) return <NotFound />;

  const url = `https://faunex.fr/especes/${page.slug}`;
  const heading = sections.title || page.animal_name;
  const metaTitle = sections.metaTitle || `${page.animal_name} — Faunex`;
  const metaDescription =
    sections.metaDescription ||
    t('species.fallbackDescription', { name: page.animal_name });
  const rarityLabel = page.rarity ? t(`bestiary.rarity.labels.${page.rarity}`, { defaultValue: '' }) : '';
  const related = others.filter((o) => o.slug !== page.slug && o.category === page.category).slice(0, 6);

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: heading,
          description: metaDescription,
          dateModified: page.updated_at,
          author: { '@type': 'Organization', name: 'Faunex' },
          publisher: { '@type': 'Organization', name: 'Faunex' },
          mainEntityOfPage: url,
          about: {
            '@type': 'Taxon',
            name: page.animal_name,
            ...(page.scientific_name ? { alternateName: page.scientific_name, taxonRank: 'species' } : {}),
          },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t('species.breadcrumbHome'), item: 'https://faunex.fr/' },
            { '@type': 'ListItem', position: 2, name: t('species.breadcrumbIndex'), item: 'https://faunex.fr/especes' },
            { '@type': 'ListItem', position: 3, name: page.animal_name, item: url },
          ],
        })}</script>
      </Helmet>

      {/* En-tête */}
      <header className="px-5 pt-6 pb-6 max-w-2xl mx-auto">
        <Link
          to="/especes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground font-display hover:text-primary mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> {t('species.backToIndex')}
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {page.category && (
            <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {t(`bestiary.categoryNames.${page.category}`, { defaultValue: page.category })}
            </span>
          )}
          {rarityLabel && (
            <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {t('species.rarityChip', { label: rarityLabel })}
            </span>
          )}
          {page.capture_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-display">
              <Users className="w-3 h-3" />
              {t('species.captureCount', { count: page.capture_count })}
            </span>
          )}
        </div>

        <h1
          className={`text-3xl sm:text-4xl font-display font-black tracking-tight transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {heading}
        </h1>
        {page.scientific_name && (
          <p className="mt-1 text-sm italic text-muted-foreground font-body">{page.scientific_name}</p>
        )}
        {sections.intro && (
          <p className="mt-4 text-base text-muted-foreground font-body leading-relaxed">{sections.intro}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="lg" className="rounded-2xl font-display font-bold">
            <Link to="/capture">
              <Camera className="w-4 h-4 mr-2" />
              {t('species.ctaIdentify', { name: page.animal_name })}
            </Link>
          </Button>
        </div>
      </header>

      {/* Sections de contenu */}
      <div className="px-5 max-w-2xl mx-auto grid gap-3">
        {SECTIONS.map(({ key, icon: Icon, labelKey }) => {
          const text = sections[key];
          if (!text) return null;
          return (
            <section key={key} className="rounded-2xl bg-card border border-border p-5">
              <h2 className="flex items-center gap-2 text-lg font-display font-bold mb-2">
                <Icon className="w-4 h-4 text-primary" />
                {t(labelKey, { name: page.animal_name })}
              </h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed whitespace-pre-line">{text}</p>
            </section>
          );
        })}

        {/* Rareté Faunex */}
        {rarityLabel && (
          <section className="rounded-2xl bg-card border border-border p-5">
            <h2 className="flex items-center gap-2 text-lg font-display font-bold mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('species.sections.rarity')}
            </h2>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              {t('species.rarityBody', {
                name: page.animal_name,
                label: rarityLabel,
                count: page.capture_count,
              })}
            </p>
          </section>
        )}

        {sections.funFact && (
          <section className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
            <h2 className="flex items-center gap-2 text-lg font-display font-bold mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('species.sections.funFact')}
            </h2>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">{sections.funFact}</p>
          </section>
        )}
      </div>

      {/* Appel à l'action principal */}
      <section className="px-5 mt-8 max-w-2xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
          <h2 className="text-xl font-display font-black text-primary-foreground mb-2">
            {t('species.cta.title', { name: page.animal_name })}
          </h2>
          <p className="text-sm text-primary-foreground/90 font-body mb-4">
            {t('species.cta.body', { name: page.animal_name })}
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="font-display font-bold rounded-2xl bg-background text-primary hover:bg-background/90"
          >
            <Link to="/auth?mode=signup">{t('species.cta.button')}</Link>
          </Button>
        </div>
      </section>

      {/* Espèces proches */}
      {related.length > 0 && (
        <section className="px-5 mt-10 max-w-2xl mx-auto">
          <h2 className="text-lg font-display font-bold mb-3">{t('species.relatedTitle')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((o) => (
              <Link
                key={o.slug}
                to={`/especes/${o.slug}`}
                className="rounded-2xl bg-card border border-border px-4 py-3 hover:border-primary/50 transition-colors"
              >
                <span className="block text-sm font-display font-bold">{o.animal_name}</span>
                {o.scientific_name && (
                  <span className="block text-xs italic text-muted-foreground font-body">{o.scientific_name}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
};

export default SpeciesPage;
