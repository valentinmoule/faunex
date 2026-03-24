import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';

const CompleteProfilePage = () => {
  const { session, recheckUsername } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed || trimmed.length < 3) {
      toast.error("Le nom d'utilisateur doit faire au moins 3 caractères");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      toast.error("Utilise uniquement des lettres, chiffres et underscores");
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
        toast.error("Ce nom d'utilisateur est déjà pris");
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
      toast.success('Bienvenue sur Faunex ! 🌿');
      navigate('/home', { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <img src="/pwa-icon-512.png" alt="Faunex" className="w-20 h-20 mx-auto" />
          <h1 className="text-2xl font-display font-bold text-foreground">Dernière étape !</h1>
          <p className="text-sm text-muted-foreground">
            Choisis ton nom d'explorateur pour que les autres puissent te retrouver.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                id="username"
                placeholder="alex_nature"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                className="pl-7"
                maxLength={30}
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">Lettres, chiffres et underscores uniquement</p>
          </div>

          <Button type="submit" className="w-full font-display font-semibold gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            {loading ? 'Vérification…' : "C'est parti !"}
          </Button>
        </form>
      </div>
    </main>
  );
};

export default CompleteProfilePage;
