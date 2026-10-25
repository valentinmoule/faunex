import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Sparkles, Upload, X, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useThemedCollections } from '@/hooks/useThemedCollections';
import { isThemeActive, type ThemedCollection } from '@/lib/themedCollections';
import { RARITY_ORDER, RARITY_LABELS } from '@/data/mockData';
import { prepareSourceFile, resizeDataUrl, dataUrlToBytes } from '@/lib/imageProcessing';
import AdventCalendarEditor from '@/components/AdventCalendarEditor';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const CATEGORIES = ['Mammifères', 'Oiseaux', 'Reptiles', 'Amphibiens', 'Poissons', 'Insectes', 'Arachnides', 'Crustacés', 'Mollusques', 'Échinodermes', 'Cnidaires', 'Autres invertébrés'];

type Draft = Omit<ThemedCollection, 'id'> & { id?: string };

const emptyDraft = (): Draft => ({
  title: '', title_en: '', description: '', cover_url: null,
  species_names: [], rule_categories: [], rule_rarities: [], rule_keywords: [],
  starts_at: null, ends_at: null, published: false, sort_order: 0,
});

const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'}`;

export default function AdminCollectionsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { collections, loaded, reload } = useThemedCollections({ all: true });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCalendar, setNewCalendar] = useState(false);
  const { t } = useTranslation();

  const status = (c: ThemedCollection) => {
    if (!c.published) return 'Brouillon';
    if (isThemeActive(c)) return 'En ligne';
    if (c.starts_at && new Date(c.starts_at) > new Date()) return 'Programmée';
    return 'Terminée';
  };

  if (newCalendar || draft?.event_kind === 'advent') return <AdventCalendarEditor initial={draft?.id ? draft as ThemedCollection : undefined} onClose={() => { setDraft(null); setNewCalendar(false); void reload(); }} />;
  if (draft) return <Editor draft={draft} userId={session?.user?.id} onClose={() => { setDraft(null); void reload(); }} />;

  return (
    <main className="min-h-screen bg-background pb-8">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors" aria-label="Retour">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-xl font-display font-bold text-foreground">Collections thématiques</h1>
          <button onClick={() => setDraft(emptyDraft())} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-display font-bold bg-primary text-primary-foreground">
            <Plus className="w-3.5 h-3.5" /> Nouvelle
          </button>
        </div>
      </PageHeader>
      <div className="max-w-lg mx-auto px-5 pt-4">
        <Button variant="outline" className="mb-4 w-full" onClick={() => setNewCalendar(true)}><Plus />{t('advent.new')}</Button>
        <p className="text-xs text-muted-foreground mb-4">Visibles par tous les utilisateurs dans le Bestiaire dès leur publication, sans mise à jour de l'app.</p>
        {!loaded ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Aucune collection pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border">
            {collections.map((c) => (
              <li key={c.id}>
                <button onClick={() => setDraft({ ...c })} className="w-full flex items-center gap-3 py-3 text-left">
                  <div className="w-12 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    {c.cover_url && <img src={c.cover_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{status(c)} · {c.species_names.length} espèce(s) choisie(s){(c.rule_categories.length || c.rule_rarities.length || c.rule_keywords.length) ? ' + règles' : ''}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Editor({ draft: initial, userId, onClose }: { draft: Draft; userId?: string; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [keywordText, setKeywordText] = useState(initial.rule_keywords.join(', '));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; scientific_name: string | null }[]>([]);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggle = (k: 'rule_categories' | 'rule_rarities', v: string) =>
    set(k, d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const safe = q.replace(/[%_,()*]/g, '');
      const { data } = await supabase.from('animals').select('name, scientific_name')
        .or(`name.ilike.%${safe}%,scientific_name.ilike.%${safe}%`).limit(20);
      setResults(data || []);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const keywords = useMemo(() => keywordText.split(',').map((s) => s.trim()).filter(Boolean), [keywordText]);
  const hasRules = d.rule_categories.length > 0 || d.rule_rarities.length > 0 || keywords.length > 0;

  const uploadFile = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const source = await prepareSourceFile(file);
      if (!source) throw new Error('unreadable');
      const blob = new Blob([dataUrlToBytes(await resizeDataUrl(source, 1200, 0.82)) as BlobPart], { type: 'image/jpeg' });
      const path = `${userId}/collections/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from('captures').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      set('cover_url', supabase.storage.from('captures').getPublicUrl(path).data.publicUrl);
    } catch {
      toast.error("Import de l'image impossible");
    } finally {
      setUploading(false);
    }
  };

  const generate = async () => {
    const prompt = genPrompt.trim() || d.title.trim();
    if (prompt.length < 3) { toast.error('Décris l’illustration souhaitée'); return; }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke('generate-collection-cover', { body: { prompt } });
    setGenerating(false);
    if (error || !data?.url) {
      let message = 'La génération a échoué';
      try { message = (await (error as { context?: Response })?.context?.json())?.error || message; } catch { /* keep default */ }
      toast.error(message);
      return;
    }
    set('cover_url', data.url);
  };

  const save = async () => {
    if (!d.title.trim()) { toast.error('Le titre est obligatoire'); return; }
    if (d.species_names.length === 0 && !hasRules) { toast.error('Ajoute des espèces ou au moins une règle'); return; }
    setSaving(true);
    const row = {
      title: d.title.trim(), title_en: d.title_en?.trim() || null, description: d.description?.trim() || null,
      cover_url: d.cover_url, species_names: d.species_names, rule_categories: d.rule_categories,
      rule_rarities: d.rule_rarities, rule_keywords: keywords, starts_at: d.starts_at, ends_at: d.ends_at,
      published: d.published, sort_order: d.sort_order,
    };
    const { error } = d.id
      ? await supabase.from('themed_collections').update(row).eq('id', d.id)
      : await supabase.from('themed_collections').insert(row);
    setSaving(false);
    if (error) { toast.error('Enregistrement impossible'); return; }
    toast.success(d.published ? 'Collection publiée' : 'Brouillon enregistré');
    onClose();
  };

  const remove = async () => {
    if (!d.id || !window.confirm('Supprimer définitivement cette collection ?')) return;
    const { error } = await supabase.from('themed_collections').delete().eq('id', d.id);
    if (error) { toast.error('Suppression impossible'); return; }
    onClose();
  };

  const previewCount = async () => {
    let q = supabase.from('animals').select('id', { count: 'exact', head: true });
    if (d.rule_categories.length) q = q.in('category', d.rule_categories.flatMap((c) => [c, `${c} (monde)`]));
    if (d.rule_rarities.length) q = q.in('rarity', d.rule_rarities);
    if (keywords.length) q = q.or(keywords.map((k) => `name.ilike.%${k.replace(/[%_,()*]/g, '')}%`).join(','));
    const { count } = await q;
    setMatchCount(count ?? 0);
  };

  const field = 'w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-display focus:outline-none focus:border-primary/50';
  const label = 'block text-xs font-display font-bold text-muted-foreground mb-1.5';

  return (
    <main className="min-h-screen bg-background pb-28">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors" aria-label="Retour">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="flex-1 text-xl font-display font-bold text-foreground">{d.id ? 'Modifier' : 'Nouvelle collection'}</h1>
          {d.id && (
            <button onClick={remove} className="p-1.5 rounded-full text-destructive hover:bg-destructive/10" aria-label="Supprimer">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </PageHeader>

      <div className="max-w-lg mx-auto px-5 pt-4 space-y-5">
        <div>
          <label className={label}>Titre (FR)</label>
          <input className={field} value={d.title} onChange={(e) => set('title', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className={label}>Titre (EN, optionnel)</label>
          <input className={field} value={d.title_en || ''} onChange={(e) => set('title_en', e.target.value)} maxLength={60} />
        </div>

        <section>
          <label className={label}>Illustration du booster</label>
          <div className="flex gap-3">
            <div className="w-24 h-36 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {d.cover_url ? <img src={d.cover_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-muted-foreground px-2 text-center">Illustration par défaut</span>}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); e.target.value = ''; }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-xs font-display font-bold">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importer une image
              </button>
              <input className={field} placeholder="Ex. papillons de nuit sous la lune" value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} />
              <button onClick={generate} disabled={generating} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 text-primary text-xs font-display font-bold">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {generating ? 'Génération…' : 'Générer avec l’IA'}
              </button>
              {d.cover_url && <button onClick={() => set('cover_url', null)} className="text-xs text-muted-foreground underline">Retirer l'image</button>}
            </div>
          </div>
        </section>

        <section>
          <label className={label}>Espèces choisies ({d.species_names.length})</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {d.species_names.map((n) => (
              <span key={n} className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-display font-semibold">
                {n}
                <button onClick={() => set('species_names', d.species_names.filter((x) => x !== n))} aria-label={`Retirer ${n}`}><X className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input className={`${field} pl-9`} placeholder="Rechercher une espèce du Bestiaire" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {results.length > 0 && (
            <ul className="mt-1 divide-y divide-border max-h-60 overflow-y-auto">
              {results.map((r) => {
                const added = d.species_names.includes(r.name);
                return (
                  <li key={`${r.name}-${r.scientific_name}`}>
                    <button disabled={added} onClick={() => set('species_names', [...d.species_names, r.name])} className="w-full text-left py-2 text-sm disabled:opacity-40">
                      <span className="font-display font-semibold">{r.name}</span>
                      {r.scientific_name && <span className="text-xs text-muted-foreground italic ml-2">{r.scientific_name}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <p className={label}>Règles automatiques (ajoutent toutes les espèces qui remplissent chaque règle renseignée)</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => <button key={c} onClick={() => toggle('rule_categories', c)} className={chip(d.rule_categories.includes(c))}>{c}</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RARITY_ORDER.map((r) => <button key={r} onClick={() => toggle('rule_rarities', r)} className={chip(d.rule_rarities.includes(r))}>{RARITY_LABELS[r]}</button>)}
          </div>
          <input className={field} placeholder="Mots du nom, séparés par des virgules (ex. nocturne, chouette)" value={keywordText} onChange={(e) => setKeywordText(e.target.value)} />
          {hasRules && (
            <button onClick={previewCount} className="text-xs font-display font-bold text-primary">
              {matchCount === null ? 'Compter les espèces concernées' : `≈ ${matchCount} espèce(s) via les règles — recompter`}
            </button>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Début (optionnel)</label>
            <input type="datetime-local" className={field} value={toLocalInput(d.starts_at)} onChange={(e) => set('starts_at', fromLocalInput(e.target.value))} />
          </div>
          <div>
            <label className={label}>Fin (optionnel)</label>
            <input type="datetime-local" className={field} value={toLocalInput(d.ends_at)} onChange={(e) => set('ends_at', fromLocalInput(e.target.value))} />
          </div>
        </section>
        <p className="text-[11px] text-muted-foreground -mt-3">Sans dates, la collection est permanente.</p>

        <div>
          <label className={label}>Ordre d'affichage (plus petit = en premier)</label>
          <input type="number" className={field} value={d.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 0)} />
        </div>

        <label className="flex items-center justify-between py-2">
          <span className="text-sm font-display font-bold text-foreground">Publier pour tous les utilisateurs</span>
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={d.published} onChange={(e) => set('published', e.target.checked)} />
        </label>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-background/90 backdrop-blur-xl border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button onClick={save} disabled={saving} className="max-w-lg mx-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-display font-bold">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
        </button>
      </div>
    </main>
  );
}
