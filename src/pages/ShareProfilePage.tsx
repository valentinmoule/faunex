import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PublicProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  species_count: number;
}

const ShareProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) { setNotFound(true); setLoading(false); return; }

      const searchName = username.startsWith('@') ? username : `@${username}`;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, level, species_count')
        .eq('username', searchName)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(data as PublicProfile);

      if (session?.user) {
        if (data.user_id === session.user.id) {
          setIsSelf(true);
        } else {
          const { data: followData } = await supabase
            .from('explorer_follows')
            .select('id')
            .eq('follower_id', session.user.id)
            .eq('following_id', data.user_id)
            .limit(1);
          setIsFollowing(!!followData && followData.length > 0);
        }
      }

      setLoading(false);
    };
    fetchProfile();
  }, [username, session]);

  const handleFollow = async () => {
    if (!session?.user || !profile) {
      navigate('/auth');
      return;
    }
    setSending(true);
    if (isFollowing) {
      await supabase.from('explorer_follows').delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', profile.user_id);
      setIsFollowing(false);
      toast.info('Désabonné');
    } else {
      const { error } = await supabase.from('explorer_follows').insert({
        follower_id: session.user.id,
        following_id: profile.user_id,
      });
      if (error) {
        if (error.code === '23505') toast.info('Déjà abonné');
        else toast.error("Erreur");
      } else {
        setIsFollowing(true);
        toast.success('Abonné !');
      }
    }
    setSending(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-4xl">🔍</p>
        <p className="text-lg font-display font-bold text-foreground">Explorateur introuvable</p>
        <p className="text-sm text-muted-foreground text-center">Ce profil n'existe pas ou le pseudo est incorrect.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm"
        >
          Retour à l'accueil
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-primary">Faunex</h1>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 text-center shadow-card space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-primary/30 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(profile.display_name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {profile.display_name || 'Explorateur'}
            </h2>
            <p className="text-sm text-muted-foreground">{profile.username || '@inconnu'}</p>
          </div>

          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-lg font-display font-bold text-foreground">{profile.level}</p>
              <p className="text-[10px] text-muted-foreground">Niveau</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-display font-bold text-foreground">{profile.species_count}</p>
              <p className="text-[10px] text-muted-foreground">Espèces</p>
            </div>
          </div>

          {isSelf ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-display font-semibold text-sm"
            >
              C'est toi ! Voir mon profil
            </button>
          ) : (
            <button
              onClick={handleFollow}
              disabled={sending}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-semibold text-sm disabled:opacity-50 transition-colors ${
                isFollowing
                  ? 'bg-muted text-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isFollowing ? (
                <><UserCheck className="w-4 h-4" /> Abonné</>
              ) : (
                <><UserPlus className="w-4 h-4" /> {session ? "S'abonner" : "Se connecter pour s'abonner"}</>
              )}
            </button>
          )}
        </div>

        {session && (
          <button
            onClick={() => navigate('/')}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors font-display"
          >
            Retour à l'accueil
          </button>
        )}
      </div>
    </main>
  );
};

export default ShareProfilePage;
