import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestCaptureCorrection } from '@/lib/captureCorrection';
import { toast } from '@/hooks/use-toast';
export function CaptureCorrectionDialog({ captureId, open, onClose, onSubmitted }: {
  captureId: string; open: boolean; onClose: () => void; onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [scientific, setScientific] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  async function submit() {
    if (lock.current || name.trim().length < 2) return;
    lock.current = true; setSending(true);
    try {
      const result = await requestCaptureCorrection(captureId, name, scientific, note);
      if (result.success || result.reason === 'already_pending') {
        toast({ title: t(result.success ? 'capture.toasts.verificationRequested' : 'capture.correction.alreadyPending') });
        onSubmitted();
      } else {
        toast({ title: t(result.reason === 'daily_limit' ? 'capture.errors.dailyAnalysisLimit' : 'capture.errors.submissionError'), variant: 'destructive' });
      }
    } catch { toast({ title: t('capture.errors.submissionError'), variant: 'destructive' }); }
    finally { lock.current = false; setSending(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!value && !sending) onClose(); }}>
    <DialogContent className="z-[1400] max-w-sm max-h-[85dvh] overflow-y-auto rounded-lg" overlayClassName="z-[1399]">
      <DialogTitle>{t('capture.correction.title')}</DialogTitle>
      <DialogDescription>{t('capture.correction.description')}</DialogDescription>
      <label className="space-y-1 text-sm">{t('capture.correction.name')}<Input value={name} onChange={e => setName(e.target.value)} maxLength={120} /></label>
      <label className="space-y-1 text-sm">{t('capture.manual.speciesPlaceholder')}<Input value={scientific} onChange={e => setScientific(e.target.value)} maxLength={160} /></label>
      <label className="space-y-1 text-sm">{t('capture.correction.note')}<Input value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={sending} onClick={onClose}>{t('capture.detail.cancel')}</Button>
        <Button disabled={sending || name.trim().length < 2} onClick={submit}>{sending && <Loader2 className="h-4 w-4 animate-spin" />}{t('capture.actions.requestVerificationBtn')}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
