import { useEffect, useState } from 'react';
import { Copy, Gift, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export function PremiumReferral({ userId, eligible, code, onCodeChange }: {
  userId: string; eligible: boolean; code: string; onCodeChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [ownCode, setOwnCode] = useState('');
  const [failed, setFailed] = useState(false);
  const loadCode = async () => {
    setFailed(false);
    const { data, error } = await supabase.rpc('my_referral_code');
    if (error) setFailed(true);
    else setOwnCode(data);
  };
  useEffect(() => { void loadCode(); }, [userId]);
  return (
    <section className="mt-6 border-t border-border py-5 space-y-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Gift className="h-5 w-5 text-primary" />{t('profile.premium.referral.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('profile.premium.referral.description')}</p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs text-muted-foreground">{t('profile.premium.referral.yourCode')}</p><p className="font-mono text-lg font-semibold">{ownCode || (failed ? '—' : <Loader2 className="h-4 w-4 animate-spin" />)}</p></div>
        {failed ? <Button variant="outline" onClick={loadCode}>{t('profile.premium.referral.retry')}</Button> : <Button variant="ghost" size="icon" disabled={!ownCode} aria-label={t('profile.premium.referral.copy')} title={t('profile.premium.referral.copy')} onClick={async () => {
          try { await navigator.clipboard.writeText(ownCode); toast.success(t('profile.premium.referral.copied')); }
          catch { toast.error(t('profile.premium.referral.copyError')); }
        }}><Copy className="h-5 w-5" /></Button>}
      </div>
      {eligible && <div className="space-y-2">
        <label htmlFor="referral-code" className="text-sm font-medium">{t('profile.premium.referral.inputLabel')}</label>
        <Input id="referral-code" value={code} onChange={event => onCodeChange(event.target.value.toUpperCase())} maxLength={12} autoCapitalize="characters" autoComplete="off" placeholder={t('profile.premium.referral.placeholder')} />
      </div>}
    </section>
  );
}