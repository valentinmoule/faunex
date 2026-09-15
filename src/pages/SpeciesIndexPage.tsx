import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import { fetchSpeciesPages } from '@/content/speciesPages';

const SpeciesIndexPage = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['species-pages-index'],
    queryFn: fetchSpeciesPages,
    staleTime: 60 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.animal_name.toLowerCase().includes(q) ||
        (p.scientific_name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q),
    );
  }, [pages, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const page of filtered) {
      const key = page.category || t('species.otherCategory');
      map.set(key, [...(map.get(key) || []), page]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, t]);

  const title = t('species.index.metaTitle');
  const description = t('species.index.metaDescription');

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href="https://faunex.fr/especes" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://faunex.fr/especes" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: 'https://faunex.fr/especes',
        })}</script>
      </Helmet>

      <header className="px-5 pt-6 pb-4 max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground font-display hover:text-primary mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> {t('species.backHome')}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight">{t('species.index.heading')}</h1>
        <p className="mt-2 text-muted-foreground font-body">
          {t('species.index.intro', { count: pages.length })}
        </p>

        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('species.index.searchPlaceholder')}
            aria-label={t('species.index.searchPlaceholder')}
            className="pl-9 rounded-2xl"
          />
        </div>
      </header>

      <div className="px-5 max-w-3xl mx-auto">
        {isLoading && <p className="text-sm text-muted-foreground font-body">{t('species.index.loading')}</p>}

        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground font-body">{t('species.index.empty')}</p>
        )}

        {grouped.map(([category, items]) => (
          <section key={category} className="mb-8">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-primary mb-3">
              {t(`bestiary.categoryNames.${category}`, { defaultValue: category })}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((p) => (
                <Link
                  key={p.slug}
                  to={`/especes/${p.slug}`}
                  className="rounded-2xl bg-card border border-border px-4 py-3 hover:border-primary/50 transition-colors"
                >
                  <span className="block text-sm font-display font-bold">{p.animal_name}</span>
                  {p.scientific_name && (
                    <span className="block text-xs italic text-muted-foreground font-body">{p.scientific_name}</span>
                  )}
                  {p.capture_count > 0 && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground font-display">
                      <Users className="w-3 h-3" />
                      {t('species.captureCount', { count: p.capture_count })}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="px-5 mt-4 max-w-3xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
          <h2 className="text-xl font-display font-black text-primary-foreground mb-2">
            {t('species.index.ctaTitle')}
          </h2>
          <p className="text-sm text-primary-foreground/90 font-body mb-4">{t('species.index.ctaBody')}</p>
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

      <Footer />
    </main>
  );
};

export default SpeciesIndexPage;
