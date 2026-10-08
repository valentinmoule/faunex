import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const REASONS = ['too_expensive', 'not_using', 'free_enough', 'missing_feature', 'unrecognized_charge', 'other'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Ouvre l'espace de gestion de l'abonnement (où se fait la résiliation). */
  onContinue: () => void;
}

/** Question courte posée avant la résiliation, pour connaître les vrais motifs de départ. */
export const CancelSurveySheet = ({ open, onOpenChange, userId, onContinue }: Props) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const submit = () => {
    // Un builder PostgREST n'émet la requête que si on branche un .then() :
    // sans lui, rien n'est écrit en base. On l'appelle sans attendre pour ne
    // pas sortir du geste utilisateur (l'ouverture du portail s'en sert).
    if (reason && !sent) {
      setSent(true);
      supabase
        .from('cancellation_feedback')
        .insert({
          user_id: userId,
          reason,
          comment: comment.trim().slice(0, 1000) || null,
        })
        .then(({ error }) => {
          if (error) console.error('[cancel-survey] enregistrement impossible:', error.message);
        });
    }
    onOpenChange(false);
    onContinue();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="z-[70] rounded-t-[2rem] pb-[calc(20px+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">{t('profile.premium.cancelSurvey.title')}</SheetTitle>
          <SheetDescription>{t('profile.premium.cancelSurvey.subtitle')}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 divide-y divide-border">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="flex w-full items-center justify-between py-3 text-left text-sm font-medium"
            >
              {t(`profile.premium.cancelSurvey.reasons.${r}`)}
              {reason === r && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
        {reason && (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder={t('profile.premium.cancelSurvey.commentPlaceholder')}
            className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          />
        )}
        <Button onClick={submit} className="mt-4 h-12 w-full rounded-2xl">
          {t('profile.premium.cancelSurvey.continue')}
        </Button>
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="mt-1 h-11 w-full rounded-2xl">
          {t('profile.premium.cancelSurvey.stay')}
        </Button>
      </SheetContent>
    </Sheet>
  );
};
