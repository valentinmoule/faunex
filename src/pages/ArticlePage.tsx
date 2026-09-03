import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';
import { getArticle, articles, localizedArticle, type ArticleType } from '@/content/articles';

const ArticlePage = ({ type }: { type: ArticleType }) => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const found = slug ? getArticle(slug) : undefined;

  if (!found || found.type !== type) {
    return <Navigate to="/404" replace />;
  }

  const article = localizedArticle(found, i18n.language);

  const basePath = type === 'guide' ? '/guides' : '/fonctionnalites';
  const url = `https://faunex.fr${basePath}/${article.slug}`;

  // 3 related articles, same type, excluding current
  const related = articles
    .filter((a) => a.type === type && a.slug !== article.slug)
    .slice(0, 3)
    .map((a) => localizedArticle(a, i18n.language));

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <Helmet>
        <title>{article.title} — Faunex</title>
        <meta name="description" content={article.description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.description} />
        <meta property="article:published_time" content={article.publishedAt} />
        {article.updatedAt && (
          <meta property="article:modified_time" content={article.updatedAt} />
        )}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt || article.publishedAt,
          author: { '@type': 'Organization', name: 'Faunex' },
          publisher: { '@type': 'Organization', name: 'Faunex' },
          mainEntityOfPage: url,
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: t('blog.home'), item: 'https://faunex.fr/' },
            {
              '@type': 'ListItem',
              position: 2,
              name: type === 'guide' ? t('blog.guidesBreadcrumb') : t('blog.useCasesBreadcrumb'),
              item: `https://faunex.fr${basePath}`,
            },
            { '@type': 'ListItem', position: 3, name: article.title, item: url },
          ],
        })}</script>
      </Helmet>

      <header className="px-5 pt-6 pb-4 max-w-2xl mx-auto">
        <Link
          to={basePath}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground font-display hover:text-primary mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> {type === 'guide' ? t('blog.backToGuides') : t('blog.backToUseCases')}
        </Link>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {article.category}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-display">
            <Clock className="w-3 h-3" /> {t('blog.readingTime', { count: article.readingMinutes })}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-display">
            <Calendar className="w-3 h-3" />
            {new Date(article.publishedAt).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight leading-tight">
          {article.title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground font-body">{article.description}</p>
      </header>

      <article className="px-5 max-w-2xl mx-auto prose prose-sm sm:prose-base dark:prose-invert prose-headings:font-display prose-headings:font-black prose-h1:hidden prose-h2:mt-8 prose-h2:mb-3 prose-h3:mt-6 prose-h3:mb-2 prose-p:font-body prose-p:leading-relaxed prose-li:font-body prose-a:text-primary prose-strong:text-foreground prose-table:text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </article>

      {/* CTA */}
      <section className="px-5 mt-10 max-w-2xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
          <h2 className="text-xl font-display font-black text-primary-foreground mb-2">
            {t('blog.ctaTitle')}
          </h2>
          <p className="text-sm text-primary-foreground/90 font-body mb-4">
            {t('blog.ctaDescription')}
          </p>
          <Button asChild size="lg" variant="secondary" className="font-display font-bold rounded-2xl bg-background text-primary hover:bg-background/90">
            <Link to="/auth?mode=signup">{t('blog.ctaButton')}</Link>
          </Button>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="px-5 mt-12 max-w-2xl mx-auto">
          <h3 className="text-lg font-display font-black mb-3">{t('blog.relatedTitle')}</h3>
          <div className="grid gap-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`${r.type === 'guide' ? '/guides' : '/fonctionnalites'}/${r.slug}`}
                className="block rounded-2xl bg-card border border-border p-4 hover:border-primary/50 transition-colors"
              >
                <p className="text-sm font-display font-bold leading-snug">{r.title}</p>
                <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-1">{r.description}</p>
              </Link>
            ))}
          </div>
      </section>
      )}
      <Footer />
    </main>
  );
};

export default ArticlePage;
