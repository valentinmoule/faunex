/**
 * Génère `public/sitemap.xml`.
 *
 * Routes statiques listées ci-dessous + une entrée par fiche espèce publiée
 * (`species_pages`, lue avec la clé publique). Si le réseau n'est pas
 * disponible, le sitemap existant est conservé tel quel.
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://faunex.fr';

const SUPABASE_URL = 'https://pakwuooxumrghsbwczwx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBha3d1b294dW1yZ2hzYndjend4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjUwMzUsImV4cCI6MjA4ODU0MTAzNX0.e8M8d_joBGqy3wJi-7WNvDcGvcbEOgNIAUb_YO_QZ1Q';

interface SitemapEntry {
  path: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/auth', changefreq: 'monthly', priority: '0.6' },
  { path: '/legal', changefreq: 'yearly', priority: '0.3' },
  { path: '/confidentialite', changefreq: 'yearly', priority: '0.4' },
  { path: '/tarifs', changefreq: 'monthly', priority: '0.8' },
  { path: '/remboursement', changefreq: 'yearly', priority: '0.3' },
  { path: '/guides', changefreq: 'weekly', priority: '0.8' },
  { path: '/guides/identifier-oiseau-photo-ia', changefreq: 'monthly', priority: '0.7' },
  { path: '/guides/animaux-jardin-france', changefreq: 'monthly', priority: '0.7' },
  { path: '/guides/difference-animaux-communs-rares', changefreq: 'monthly', priority: '0.7' },
  { path: '/guides/identification-insectes', changefreq: 'monthly', priority: '0.7' },
  { path: '/guides/identification-animaux', changefreq: 'monthly', priority: '0.7' },
  { path: '/fonctionnalites', changefreq: 'weekly', priority: '0.8' },
  { path: '/fonctionnalites/app-collection-animaux-balade', changefreq: 'monthly', priority: '0.7' },
  { path: '/fonctionnalites/reconnaissance-animaux-ia-famille', changefreq: 'monthly', priority: '0.7' },
  { path: '/especes', changefreq: 'weekly', priority: '0.9' },
];

function xml(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      '  <url>',
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n');
}

async function speciesEntries(): Promise<SitemapEntry[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/species_pages?select=slug&published=eq.true&order=capture_count.desc`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  if (!res.ok) throw new Error(`species_pages ${res.status}`);
  const rows = (await res.json()) as Array<{ slug: string }>;
  return rows.map((r) => ({
    path: `/especes/${r.slug}`,
    changefreq: 'monthly' as const,
    priority: '0.8',
  }));
}

const out = resolve('public/sitemap.xml');

try {
  const species = await speciesEntries();
  const entries = [...staticEntries, ...species];
  writeFileSync(out, xml(entries));
  console.log(`sitemap.xml written (${entries.length} entries, ${species.length} species pages)`);
} catch (e) {
  if (existsSync(out)) {
    console.warn(`sitemap.xml kept as-is (${String(e)})`);
  } else {
    writeFileSync(out, xml(staticEntries));
    console.warn(`sitemap.xml written without species pages (${String(e)})`);
  }
}
