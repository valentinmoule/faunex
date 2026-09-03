import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { translateAuthError } from '@/lib/authErrors';

type Status = 'checking' | 'ready' | 'invalid';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>('checking');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready');
      }
    });

    const init = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errorDescription = searchParams.get('error_description') || hash.get('error_description');
      if (errorDescription) {
        if (!cancelled) setStatus('invalid');
        return;
      }

      // Lien OTP (token_hash) : on l'échange contre une session de récupération
      const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
        if (!cancelled) setStatus(error ? 'invalid' : 'ready');
        return;
      }

      // Lien PKCE (?code=) ou tokens dans le hash : détectés par le client Supabase
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setStatus('ready');
        return;
      }
      // Laisse une courte fenêtre au client pour traiter l'URL
      setTimeout(async () => {
        const { data: retry } = await supabase.auth.getSession();
        if (!cancelled) setStatus(retry.session ? 'ready' : 'invalid');
      }, 1200);
    };

    init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t('auth.resetPassword.toasts.mismatch'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('auth.resetPassword.toasts.tooShort'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t('auth.resetPassword.toasts.updated'));
      navigate('/home', { replace: true });
    } catch (error: any) {
      toast.error(translateAuthError(error.message, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <img src="/pwa-icon-512.png" alt={t('auth.logoAlt')} className="w-20 h-20 mx-auto" />
          <h1 className="text-2xl font-display font-bold text-foreground">{t('auth.resetPassword.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {status === 'invalid'
              ? t('auth.resetPassword.subtitleInvalid')
              : t('auth.resetPassword.subtitleReady')}
          </p>
        </div>

        {status === 'checking' && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">{t('auth.resetPassword.checking')}</p>
        )}

        {status === 'invalid' && (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('auth.resetPassword.invalidText')}
            </p>
            <Button asChild className="w-full font-display font-semibold">
              <Link to="/auth">{t('auth.resetPassword.requestNewLink')}</Link>
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.labels.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.placeholders.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.labels.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.placeholders.password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full font-display font-semibold" disabled={loading}>
              {loading ? t('auth.buttons.loading') : t('auth.resetPassword.updateButton')}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
};

export default ResetPasswordPage;
