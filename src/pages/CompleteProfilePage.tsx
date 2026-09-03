import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CompleteProfilePage = () => {
  const { t } = useTranslation();
  const { session, recheckUsername } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed || trimmed.length < 3) {
      toast.error(t('auth.completeProfile.toasts.tooShort'));
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      toast.error(t('auth.completeProfile.toasts.invalidChars'));
      return;
    }

    setLoading(true);
    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', `@${trimmed}`)
        .neq('user_id', session!.user.id)
        .maybeSingle();

      if (existing) {
        toast.error(t('auth.completeProfile.toasts.usernameTaken'));
        setLoading(false);
        return;
      }

      const displayName = session?.user.user_metadata?.full_name
        || session?.user.user_metadata?.display_name
        || trimmed;

      const { error } = await supabase
        .from('profiles')
        .update({
          username: `@${trimmed}`,
          display_name: displayName,
        })
        .eq('user_id', session!.user.id);

      if (error) throw error;
      await recheckUsername();
      toast.success(t('auth.completeProfile.toasts.welcome'));
      navigate('/home', { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(t('auth.completeProfile.toasts.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <img src="/pwa-icon-512.png" alt={t('auth.logoAlt')} className="w-20 h-20 mx-auto" />
          <h1 className="text-2xl font-display font-bold text-foreground">{t('auth.completeProfile.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.completeProfile.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t('auth.labels.username')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                id="username"
                placeholder={t('auth.placeholders.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                className="pl-7"
                maxLength={30}
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('auth.completeProfile.hint')}</p>
          </div>

          <Button type="submit" className="w-full font-display font-semibold gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            {loading ? t('auth.completeProfile.verifying') : t('auth.completeProfile.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
};

export default CompleteProfilePage;
