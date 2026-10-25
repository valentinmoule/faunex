import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from 'vaul';
import { Loader2, ScanSearch } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { requestCaptureCorrection } from '@/lib/captureCorrection';
import { toast } from '@/hooks/use-toast';

type ReportType = 'wrong_species' | 'does_not_exist';

/**
 * Fenêtre unique « Corriger l'espèce / Signaler une fiche erronée ».
 * - Avec captureId (propriétaire de la capture) : demande de correction en
 *   modération, qui consomme une analyse du quota.
 * - Sans captureId : signalement de la fiche, sans quota. L'utilisateur choisit
 *   un motif : espèce incorrecte (il propose alors le bon nom) ou fiche qui ne
 *   correspond à aucune espèce réelle.
 */
export function CaptureCorrectionDialog({ captureId, speciesName, speciesScientific, open, onClose, onSubmitted }: {
  captureId?: string;
  speciesName: string;
  speciesScientific?: string | null;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const isReport = !captureId;
  const [type, setType] = useState<ReportType>('wrong_species');
  const [name, setName] = useState('');
  const [scientific, setScientific] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const lock = useRef(false);

  // Fiche signalée comme n'existant pas : aucun nom à proposer, seul le motif compte.
  const missing = isReport && type === 'does_not_exist';
  const needsName = !missing && name.trim().length < 2;

  async function submit() {
    if (lock.current || needsName) return;
    lock.current = true; setSending(true);
    try {
      if (isReport) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('unauthenticated');
        const reason = missing
          ? (note.trim() || t('species.report.typeDoesNotExist'))
          : `${name.trim()}${scientific.trim() ? ` (${scientific.trim()})` : ''}${note.trim() ? ` — ${note.trim()}` : ''}`;
        const { error } = await supabase.from('species_reports').insert({
          user_id: session.user.id,
          species_name: speciesName,
          scientific_name: speciesScientific || null,
          reason,
          report_type: type,
        });
        // 23505 = signalement déjà envoyé pour cette fiche : on confirme quand même.
        if (error && error.code !== '23505') throw error;
        toast({ title: t('species.report.sent') });
        onSubmitted();
        return;
      }
      const result = await requestCaptureCorrection(captureId!, name, scientific, note);
      if (result.success || result.reason === 'already_pending') {
        toast({ title: t(result.success ? 'capture.toasts.verificationRequested' : 'capture.correction.alreadyPending') });
        onSubmitted();
      } else {
        toast({ title: t(result.reason === 'daily_limit' ? 'capture.errors.dailyAnalysisLimit' : 'capture.errors.submissionError'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t(isReport ? 'species.report.error' : 'capture.errors.submissionError'), variant: 'destructive' });
    }
    finally { lock.current = false; setSending(false); }
  }

  const fieldClass =
    'h-12 rounded-2xl border-none bg-muted/60 px-4 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/40';

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o && !sending) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1400] bg-foreground/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1401] max-h-[92vh] rounded-t-3xl bg-background pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted" />

          <div className="px-5 pt-4 space-y-5 overflow-y-auto">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ScanSearch className="h-7 w-7 text-primary" />
              </span>
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold">{t(isReport ? 'species.report.dialogTitle' : 'capture.correction.title')}</h2>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t(isReport ? (missing ? 'species.report.dialogDescriptionMissing' : 'species.report.dialogDescription') : 'capture.correction.description')}
                </p>
              </div>
            </div>

            {isReport && (
              <div className="space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('species.report.typeLabel')}</span>
                <div className="flex flex-wrap gap-2">
                  {(['wrong_species', 'does_not_exist'] as const).map(k => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={type === k}
                      onClick={() => setType(k)}
                      className="game-chip inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
                    >
                      {t(k === 'does_not_exist' ? 'species.report.typeDoesNotExist' : 'species.report.typeWrongSpecies')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {!missing && (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('capture.correction.name')}</span>
                    <Input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder={t('capture.manual.namePlaceholder')} className={fieldClass} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('capture.manual.speciesPlaceholder')}</span>
                    <Input value={scientific} onChange={e => setScientific(e.target.value)} maxLength={160} placeholder="Ex. Lynx borealis" className={fieldClass} />
                  </label>
                </>
              )}
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('capture.correction.note')}</span>
                <Input
                  autoFocus={missing}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={500}
                  placeholder={t(missing ? 'species.report.missingNotePlaceholder' : 'capture.manual.descriptionPlaceholder')}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="space-y-2">
              <button
                onClick={submit}
                disabled={sending || needsName}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-50"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t(isReport ? 'species.report.send' : 'capture.actions.requestVerificationBtn')}
              </button>
              <button
                onClick={onClose}
                disabled={sending}
                className="flex h-11 w-full items-center justify-center rounded-2xl text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
              >
                {t('capture.detail.cancel')}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
