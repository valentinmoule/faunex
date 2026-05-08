import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Leaf, Eye, EyeOff } from 'lucide-react';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://faunex.lovable.app/reset-password',
      });
      if (error) throw error;
      toast.success('Email de réinitialisation envoyé ! Vérifie ta boîte mail.');
      setIsForgot(false);
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Connexion réussie !');
        navigate('/home');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: 'https://faunex.lovable.app',
          },
        });
        if (error) throw error;
        toast.success('Compte créé ! Vérifie ton email pour confirmer.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <img src="/pwa-icon-512.png" alt="Faunex" className="w-24 h-24 mx-auto" />
          <h1 className="text-3xl font-display font-bold text-foreground">Faunex</h1>
          <p className="text-sm text-muted-foreground">
            {isForgot
              ? 'Entre ton email pour réinitialiser ton mot de passe'
              : isLogin
                ? 'Content de te revoir, explorateur !'
                : 'Ouvre les yeux sur la faune qui t\'entoure.'}
          </p>
          {!isLogin && !isForgot && (
            <p className="text-xs text-muted-foreground/70 max-w-[280px] mx-auto leading-relaxed mt-1">
              Photographie, identifie et collectionne les animaux que tu croises au quotidien. Chaque sortie devient une aventure 🌿
            </p>
          )}
        </div>

        {isForgot ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="explorateur@nature.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full font-display font-semibold" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <button
                onClick={() => setIsForgot(false)}
                className="text-primary font-display font-semibold hover:underline"
              >
                Retour à la connexion
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nom d'explorateur</Label>
                <Input
                  id="displayName"
                  placeholder="Alex Moreau"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="explorateur@nature.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setIsForgot(true)}
                    className="text-xs text-primary font-display font-semibold hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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

            <Button type="submit" className="w-full font-display font-semibold" disabled={loading}>
              {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer mon compte'}
            </Button>

            {/* SSO divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground font-display">ou continuer avec</span>
              </div>
            </div>

            {/* SSO buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-display font-semibold gap-2"
                disabled={loading}
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth('google', {
                    redirect_uri: window.location.origin,
                  });
                  if (error) toast.error('Erreur de connexion Google');
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-display font-semibold gap-2"
                disabled={loading}
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth('apple', {
                    redirect_uri: window.location.origin,
                  });
                  if (error) toast.error('Erreur de connexion Apple');
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </Button>
            </div>
          </form>
        )}

        {!isForgot && (
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-display font-semibold hover:underline"
            >
              {isLogin ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        )}
      </div>
    </main>
  );
};

export default AuthPage;
