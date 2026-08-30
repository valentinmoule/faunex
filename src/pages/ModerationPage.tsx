import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft, Check, X, Loader2, AlertTriangle, Sparkles, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HolographicCard from '@/components/HolographicCard';
import { RARITY_LABELS, type Rarity } from '@/data/mockData';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

interface PendingCapture {
  id: string;
  animal_name: string;
  scientific_name: string | null;
  image_url: string;
  location: string | null;
  created_at: string;
  user_id: string;
  description: string | null;
  caption: string | null;

  user_display_name?: string;
}

interface EnrichedAnimal {
  animal_name: string;
  scientific_name: string | null;
  category: string | null;
  description: string | null;
  habitat: string | null;
  diet: string | null;
  conservation: string | null;
  fun_fact: string | null;
  rarity: Rarity;
  subject_bbox?: { x: number; y: number; w: number; h: number } | null;
}


interface PrepareFailure {
  code: string;
  message: string;
  detail?: string;
  canRetryHigh?: boolean;
  duplicate?: { id: string; animal_name: string; created_at: string } | null;
}

/** Récupère le corps JSON d'une erreur d'edge function (statut non-2xx). */
const readFunctionError = async (error: any): Promise<PrepareFailure> => {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.clone().json();
      return {
        code: body?.code || 'unknown',
        message: body?.error || 'Erreur inconnue',
        detail: body?.detail,
        canRetryHigh: body?.can_retry_high,
        duplicate: body?.duplicate ?? null,
      };
    }
  } catch (e) {
    console.error('unreadable function error', e);
  }
  return { code: 'network', message: error?.message || 'Fonction injoignable (réseau ou timeout).' };
};

/** État de la tâche planifiée d'auto-modération. */
type JobState = { status: string; paused_reason: string | null; last_run_at: string | null };


const ModerationPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [captures, setCaptures] = useState<PendingCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ capture: PendingCapture; animal: EnrichedAnimal } | null>(null);
  const [confirming, setConfirming] = useState(false);
  /** État de la tâche de fond d'auto-modération (serveur). */
  const [jobState, setJobState] = useState<JobState | null>(null);


  /** Diagnostic d'échec de la prévisualisation, par capture. */
  const [failures, setFailures] = useState<Record<string, PrepareFailure>>({});
  /** Nom d'animal proposé par le modérateur, par capture. */
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  /** Nom scientifique proposé par le modérateur, par capture. */
  const [scientificOverrides, setScientificOverrides] = useState<Record<string, string>>({});


  useEffect(() => {
    if (!session?.user) return;
    fetchPending();
  }, [session]);


  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('captures')
      .select('id, animal_name, scientific_name, image_url, location, created_at, user_id, description, caption')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Fetch user names
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.display_name || p.username || 'Inconnu'])
      );

      setCaptures(data.map(c => ({
        ...c,
        user_display_name: profileMap.get(c.user_id) || 'Inconnu',
      })));
    }
    setLoading(false);
  };

  /**
   * Step 1 — generate the enriched sheet and open the preview (no approval yet).
   * `forceName` : le nom de l'explorateur fait autorité, l'IA ne fait aucune
   * reconnaissance d'image et complète uniquement la fiche documentaire.
   */
  const prepareApprove = async (
    capture: PendingCapture,
    quality: 'standard' | 'high' = 'standard',
    forceName = false,
    /** Nom saisi par le modérateur : remplace celui de l'explorateur. */
    nameOverride?: string,
    /** Nom scientifique saisi par le modérateur. */
    scientificOverride?: string,
  ) => {

    setProcessing(capture.id);
    setFailures(prev => {
      const next = { ...prev };
      delete next[capture.id];
      return next;
    });
    // Filet de sécurité : si la fonction ne répond jamais (gateway bloqué), on
    // libère l'UI au lieu de laisser un loader infini.
    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('client_timeout')), ms)),
      ]);

    let enriched: any = null;
    let enrichError: any = null;
    try {
      const res = await withTimeout(
        supabase.functions.invoke('enrich-capture', {
          body: {
            capture_id: capture.id,
            animal_name: (nameOverride?.trim() || capture.animal_name),
            scientific_name: (scientificOverride?.trim() || undefined),
            quality,
            force_name: forceName,
          },

        }),
        75_000,
      );
      enriched = res.data;
      enrichError = res.error;
    } catch {
      enrichError = null;
      enriched = null;
      setProcessing(null);
      const failure = { code: 'client_timeout', message: "La génération a dépassé 75 s. Réessaye ou utilise le modèle avancé." };
      setFailures(prev => ({ ...prev, [capture.id]: failure }));
      toast.error(failure.message);
      return;
    }
    setProcessing(null);

    if (enrichError || !enriched?.animal) {
      const failure = enrichError
        ? await readFunctionError(enrichError)
        : { code: 'empty_response', message: "La fonction a répondu sans fiche exploitable." };
      console.error('enrich-capture failed', failure);
      setFailures(prev => ({ ...prev, [capture.id]: failure }));
      toast.error(failure.message);
      return;
    }

    setPreview({ capture, animal: enriched.animal as EnrichedAnimal });
  };

  /** Step 2 — the moderator validated the preview: publish the capture. */
  const confirmApprove = async () => {
    if (!preview) return;
    const { capture, animal } = preview;
    const finalName = animal.animal_name || capture.animal_name;
    setConfirming(true);

    // La prévisualisation n'écrit rien : on applique la fiche enrichie maintenant.
    const { error: applyError } = await supabase.functions.invoke('enrich-capture', {
      body: { capture_id: capture.id, apply: true, animal },
    });
    if (applyError) {
      const failure = await readFunctionError(applyError);
      toast.error(failure.message);
      setConfirming(false);
      return;
    }

    const { error } = await supabase
      .from('captures')
      .update({ status: 'approved' })
      .eq('id', capture.id);

    if (error) {
      // Index unique (user_id, animal_name) sur les captures approuvées :
      // l'explorateur possède déjà cette espèce, l'approbation est impossible.
      const isDuplicate =
        (error as any).code === '23505' ||
        /captures_unique_species_per_user|duplicate key/i.test(error.message || '');
      toast.error(
        isDuplicate
          ? `${finalName} : cet explorateur possède déjà cette espèce (1 capture par espèce). Renomme l'espèce ou rejette la capture.`
          : `Erreur lors de l'approbation : ${error.message}`,
      );
    } else {


      // Notify the user that their capture was approved
      if (session?.user) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: capture.user_id,
          type: 'capture_approved',
          actor_id: session.user.id,
          capture_id: capture.id,
        });
        if (notifError) {
          console.error('notification approve failed', notifError);
          toast.warning('Capture approuvée, mais la notification n\'a pas pu être envoyée');
        }
        supabase.functions
          .invoke('notify-moderation-decision', {
            body: {
              user_id: capture.user_id,
              decision: 'approved',
              animal_name: finalName,
              capture_id: capture.id,
            },
          })
          .then(({ error: fnError }) => {
            if (fnError) console.error('notify-moderation-decision failed', fnError);
          });
      }

      toast.success(`${finalName} approuvé !`);

      setCaptures(prev => prev.filter(c => c.id !== capture.id));
      setPreview(null);
    }
    setConfirming(false);
  };


  const reject = async (capture: PendingCapture, reason: 'not_identifiable' | 'duplicate' = 'not_identifiable') => {
    setProcessing(capture.id);
    // Notify the user BEFORE deleting (the capture row disappears afterwards)
    if (session?.user) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: capture.user_id,
        type: 'capture_rejected',
        actor_id: session.user.id,
        comment_text: capture.animal_name,
      });
      if (notifError) {
        console.error('notification reject failed', notifError);
        toast.warning('La notification de rejet n\'a pas pu être envoyée');
      }
      supabase.functions
        .invoke('notify-moderation-decision', {
          body: {
            user_id: capture.user_id,
            decision: 'rejected',
            animal_name: capture.animal_name,
            capture_id: capture.id,
            reason,
          },
        })
        .then(({ error: fnError }) => {
          if (fnError) console.error('notify-moderation-decision failed', fnError);
        });
    }

    const { error } = await supabase
      .from('captures')
      .delete()
      .eq('id', capture.id);

    if (error) {
      toast.error('Erreur lors du rejet');
    } else {
      toast.success(
        reason === 'duplicate'
          ? `${capture.animal_name} rejeté (doublon) — l'explorateur est prévenu`
          : `${capture.animal_name} rejeté et supprimé`
      );
      setCaptures(prev => prev.filter(c => c.id !== capture.id));
    }
    setProcessing(null);
  };

  /**
   * La pré-modération IA ne tourne plus depuis le backoffice : elle s'exécute
   * côté serveur au fil de l'eau (dès l'enregistrement d'une capture) et par
   * petits lots planifiés toutes les 2 heures. Ici on affiche seulement l'état
   * de cette tâche de fond.
   */
  useEffect(() => {
    if (!session?.user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('background_jobs')
        .select('status, paused_reason, last_run_at')
        .eq('job_key', 'auto_moderate_captures')
        .maybeSingle();
      if (active && data) setJobState(data as JobState);
    };
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session]);


  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  return (
    <main className="min-h-screen bg-background pb-8">
      <PageHeader sticky className="bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-foreground">Backoffice</h1>
            <p className="text-xs text-muted-foreground">{captures.length} en attente</p>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-display font-bold ${
              jobState?.status === 'paused'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
            title={jobState?.paused_reason ?? undefined}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {jobState?.status === 'paused' ? 'Auto-validation en pause' : 'Auto-validation planifiée'}
          </div>


        </div>
      </PageHeader>


      <div className="max-w-3xl mx-auto px-4 pt-4">
        <Tabs defaultValue="moderation" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="moderation">Modération</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="moderation">
            {loading ? (
              <div className="text-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground font-display text-sm">Chargement…</p>
              </div>
            ) : captures.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-muted-foreground font-display">Aucune capture en attente</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-lg mx-auto">
                {captures.map(capture => (
                  <div key={capture.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-card">
                    <div className="relative w-full overflow-hidden bg-muted flex items-center justify-center">
                      <img src={capture.image_url} alt={capture.animal_name} className="w-full h-auto max-h-[70vh] object-contain" />

                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber/90 text-foreground rounded-full px-2.5 py-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[10px] font-display font-bold uppercase">En attente</span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div>
                        <h3 className="text-base font-display font-bold text-foreground">{capture.animal_name}</h3>
                        {capture.scientific_name && (
                          <p className="text-xs text-muted-foreground italic">{capture.scientific_name}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Par {capture.user_display_name}</span>
                        <span>·</span>
                        <span>Il y a {timeAgo(capture.created_at)}</span>
                        {capture.location && (
                          <>
                            <span>·</span>
                            <span>{capture.location}</span>
                          </>
                        )}
                      </div>

                      {(capture.description || capture.caption) && (
                        <div className="rounded-xl bg-muted/60 border border-border/60 p-3">
                          <p className="text-[10px] font-display font-bold uppercase tracking-wide text-muted-foreground mb-1">
                            Description de l'explorateur
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {capture.description || capture.caption}
                          </p>
                        </div>
                      )}


                      {failures[capture.id] && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                          <p className="text-[10px] font-display font-bold uppercase tracking-wide text-destructive">
                            {failures[capture.id].code === 'duplicate'
                              ? 'Espèce déjà collectionnée'
                              : failures[capture.id].code === 'ai_no_result' || failures[capture.id].code === 'ai_error'
                                ? 'Échec du modèle IA'
                                : 'Échec de la prévisualisation'}
                          </p>
                          <p className="text-xs text-foreground">{failures[capture.id].message}</p>
                          {failures[capture.id].duplicate && (
                            <p className="text-[11px] text-muted-foreground">
                              Capture existante : {failures[capture.id].duplicate!.animal_name} (
                              {new Date(failures[capture.id].duplicate!.created_at).toLocaleDateString('fr-FR')})
                            </p>
                          )}
                          {failures[capture.id].detail && (
                            <p className="text-[10px] text-muted-foreground break-words">
                              Détail technique : {failures[capture.id].detail}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {failures[capture.id].code === 'duplicate' ? (
                              <button
                                onClick={() => reject(capture, 'duplicate')}
                                disabled={processing === capture.id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-display font-semibold disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" /> Rejeter (doublon)
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => prepareApprove(capture, 'high')}
                                  disabled={processing === capture.id}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5" /> Réessayer (modèle avancé)
                                </button>
                                <button
                                  onClick={() => prepareApprove(capture, 'standard', true)}
                                  disabled={processing === capture.id}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-foreground text-xs font-display font-semibold disabled:opacity-50"
                                >
                                  <Lock className="w-3.5 h-3.5" /> Forcer « {capture.animal_name} »
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <button
                            onClick={() => reject(capture)}
                            disabled={processing === capture.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-display font-semibold disabled:opacity-50 hover:bg-destructive/20 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Rejeter
                          </button>
                          <button
                            onClick={() => prepareApprove(capture)}
                            disabled={processing === capture.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
                          >
                            {processing === capture.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            {processing === capture.id ? 'Génération…' : 'Prévisualiser (IA + photo)'}
                          </button>
                        </div>
                        <button
                          onClick={() => prepareApprove(capture, 'standard', true)}
                          disabled={processing === capture.id}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-muted text-foreground text-xs font-display font-semibold disabled:opacity-50 hover:bg-muted/80 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Forcer le nom de l'explorateur (fiche seule)
                        </button>

                        {/* Nom proposé par le modérateur */}
                        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                          <p className="text-[10px] font-display font-bold uppercase tracking-wide text-muted-foreground">
                            Mon identification
                          </p>
                          <input
                            value={nameOverrides[capture.id] ?? ''}
                            onChange={e =>
                              setNameOverrides(prev => ({ ...prev, [capture.id]: e.target.value }))
                            }
                            placeholder="Nom commun — ex. Épagneul picard"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <input
                            value={scientificOverrides[capture.id] ?? ''}
                            onChange={e =>
                              setScientificOverrides(prev => ({ ...prev, [capture.id]: e.target.value }))
                            }
                            placeholder="Nom scientifique — ex. Canis lupus familiaris"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs italic text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            « Forcer » impose le nom (et le binôme s'il est saisi) sans reconnaissance d'image.
                            « Vérifier avec l'IA » les utilise comme indices.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                prepareApprove(
                                  capture, 'standard', true,
                                  nameOverrides[capture.id], scientificOverrides[capture.id],
                                )
                              }
                              disabled={
                                processing === capture.id ||
                                !((nameOverrides[capture.id] || '').trim() ||
                                  (scientificOverrides[capture.id] || '').trim())
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
                            >
                              <Lock className="w-3.5 h-3.5" /> Forcer ce nom
                            </button>
                            <button
                              onClick={() =>
                                prepareApprove(
                                  capture, 'standard', false,
                                  nameOverrides[capture.id], scientificOverrides[capture.id],
                                )
                              }
                              disabled={
                                processing === capture.id ||
                                !((nameOverrides[capture.id] || '').trim() ||
                                  (scientificOverrides[capture.id] || '').trim())
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-display font-semibold disabled:opacity-50 hover:bg-muted/80 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Vérifier avec l'IA
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Populate bestiary section */}
            <div className="mt-8 p-4 rounded-xl border border-border bg-card max-w-lg mx-auto">
              <h2 className="font-display font-bold text-foreground mb-2">Bestiaire</h2>
              <p className="text-xs text-muted-foreground mb-3">Peuple le bestiaire avec des milliers d'espèces via l'IA. Chaque clic traite une catégorie.</p>
              <BestiaryPopulator />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => { if (!open && !confirming) setPreview(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Aperçu de la carte enrichie</DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              <HolographicCard
                rarity={preview.animal.rarity}
                subjectBox={preview.animal.subject_bbox ?? null}
                className="w-full aspect-[4/5] rounded-2xl overflow-hidden"
              >
                <img
                  src={preview.capture.image_url}
                  alt={preview.animal.animal_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-sm font-display font-bold text-white">{preview.animal.animal_name}</p>
                  {preview.animal.scientific_name && (
                    <p className="text-[11px] italic text-white/80">{preview.animal.scientific_name}</p>
                  )}
                </div>
              </HolographicCard>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-display font-bold uppercase tracking-wide px-2.5 py-1 rounded-full rarity-${preview.animal.rarity} bg-muted text-foreground`}>
                  {RARITY_LABELS[preview.animal.rarity] || preview.animal.rarity}
                </span>
                {preview.animal.category && (
                  <span className="text-[10px] font-display uppercase tracking-wide px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {preview.animal.category}
                  </span>
                )}
                {preview.animal.conservation && (
                  <span className="text-[10px] font-display uppercase tracking-wide px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    UICN {preview.animal.conservation}
                  </span>
                )}
              </div>

              <div className="space-y-3 text-sm">
                {preview.animal.description && (
                  <p className="text-foreground">{preview.animal.description}</p>
                )}
                {preview.animal.habitat && (
                  <p className="text-muted-foreground"><span className="font-display font-semibold text-foreground">Habitat · </span>{preview.animal.habitat}</p>
                )}
                {preview.animal.diet && (
                  <p className="text-muted-foreground"><span className="font-display font-semibold text-foreground">Régime · </span>{preview.animal.diet}</p>
                )}
                {preview.animal.fun_fact && (
                  <p className="text-muted-foreground"><span className="font-display font-semibold text-foreground">Le saviez-vous · </span>{preview.animal.fun_fact}</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPreview(null)}
                  disabled={confirming}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-xs font-display font-semibold disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={confirming}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
                >
                  {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Approuver
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

const BestiaryPopulator = () => {
  const [populating, setPopulating] = useState(false);
  const [progress, setProgress] = useState('');
  const [nextIndex, setNextIndex] = useState(0);
  const [totalInDb, setTotalInDb] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const populate = async () => {
    setPopulating(true);
    setProgress('Génération en cours…');
    try {
      const { data, error } = await supabase.functions.invoke('populate-bestiary', {
        body: { startIndex: nextIndex },
      });
      if (error) throw error;
      setProgress(`✅ ${data.processed} — ${data.results?.[0]?.inserted || 0} espèces ajoutées`);
      setTotalInDb(data.totalInDb);
      if (data.done) {
        setDone(true);
        toast.success('Bestiaire complet !');
      } else {
        setNextIndex(data.nextIndex);
      }
    } catch (err: any) {
      console.error(err);
      setProgress(`❌ Erreur: ${err.message}`);
      toast.error('Erreur lors de la génération');
    } finally {
      setPopulating(false);
    }
  };

  return (
    <div className="space-y-2">
      {totalInDb !== null && (
        <p className="text-sm font-display text-foreground">{totalInDb} espèces en base</p>
      )}
      {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
      <button
        onClick={populate}
        disabled={populating || done}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
      >
        {populating ? (
          <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération…</span>
        ) : done ? (
          'Terminé ✅'
        ) : (
          `Générer la catégorie ${nextIndex + 1}/15`
        )}
      </button>
    </div>
  );
};

export default ModerationPage;
