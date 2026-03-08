import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, Clock, UserCheck, Loader2 } from 'lucide-react';
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
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'self'>('none');
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

      // Check friend status if logged in
      if (session?.user) {
        if (data.user_id === session.user.id) {
          setFriendStatus('self');
        } else {
          const { data: relations } = await supabase
            .from('explorer_friends')
            .select('*')
            .or(`and(requester_id.eq.${session.user.id},addressee_id.eq.${data.user_id}),and(requester_id.eq.${data.user_id},addressee_id.eq.${session.user.id})`);

          if (relations && relations.length > 0) {
            const rel = relations[0];
            if (rel.status === 'accepted') setFriendStatus('accepted');
            else if (rel.requester_id === session.user.id) setFriendStatus('pending_sent');
            else setFriendStatus('pending_received');
          }
        }
      }

      setLoading(false);
    };
    fetchProfile();
  }, [username, session]);

  const handleAddFriend = async () => {
    if (!session?.user || !profile) {
      navigate('/auth');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('explorer_friends').insert({
      requester_id: session.user.id,
      addressee_id: profile.user_id,
    });
    if (error) {
      if (error.code === '23505') toast.info('Demande déjà envoyée');
      else toast.error("Erreur lors de l'envoi");
    } else {
      setFriendStatus('pending_sent');
      toast.success('Demande d\'ami envoyée !');
    }
    setSending(false);
  };

  const handleAccept = async () => {
    if (!session?.user || !profile) return;
    setSending(true);
    const { error } = await supabase
      .from('explorer_friends')
      .update({ status: 'accepted' })
      .eq('requester_id', profile.user_id)
      .eq('addressee_id', session.user.id);
    if (error) toast.error('Erreur');
    else {
      setFriendStatus('accepted');
      toast.success('Ami ajouté !');
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
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-primary">Faunex</h1>
        </div>

        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-6 text-center shadow-card space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-display font-bold text-primary border-2 border-primary/30 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(profile.display_name || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>

          {/* Name & username */}
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {profile.display_name || 'Explorateur'}
            </h2>
            <p className="text-sm text-muted-foreground">{profile.username || '@inconnu'}</p>
          </div>

          {/* Mini stats */}
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

          {/* Action button */}
          {friendStatus === 'self' ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-display font-semibold text-sm"
            >
              C'est toi ! Voir mon profil
            </button>
          ) : friendStatus === 'accepted' ? (
            <div className="flex items-center justify-center gap-2 py-3 text-primary font-display font-semibold text-sm">
              <UserCheck className="w-5 h-5" />
              Déjà amis
            </div>
          ) : friendStatus === 'pending_sent' ? (
            <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground font-display font-semibold text-sm">
              <Clock className="w-5 h-5" />
              Demande envoyée
            </div>
          ) : friendStatus === 'pending_received' ? (
            <button
              onClick={handleAccept}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Accepter la demande
            </button>
          ) : (
            <button
              onClick={handleAddFriend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {session ? 'Ajouter en ami' : 'Se connecter pour ajouter'}
            </button>
          )}
        </div>

        {/* Back link */}
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
