import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PendingCapture {
  id: string;
  animal_name: string;
  scientific_name: string | null;
  image_url: string;
  location: string | null;
  created_at: string;
  user_id: string;
  user_display_name?: string;
}

const ModerationPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [captures, setCaptures] = useState<PendingCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetchPending();
  }, [session]);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('captures')
      .select('id, animal_name, scientific_name, image_url, location, created_at, user_id')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Fetch user names
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.display_name || p.username || 'Inconnu'])
      );

      setCaptures(data.map(c => ({
        ...c,
        user_display_name: profileMap.get(c.user_id) || 'Inconnu',
      })));
    }
    setLoading(false);
  };

  const approve = async (capture: PendingCapture) => {
    setProcessing(capture.id);
    const { error } = await supabase
      .from('captures')
      .update({ status: 'approved' })
      .eq('id', capture.id);

    if (error) {
      toast.error('Erreur lors de l\'approbation');
    } else {
      toast.success(`${capture.animal_name} approuvé !`);
      setCaptures(prev => prev.filter(c => c.id !== capture.id));
    }
    setProcessing(null);
  };

  const reject = async (capture: PendingCapture) => {
    setProcessing(capture.id);
    const { error } = await supabase
      .from('captures')
      .delete()
      .eq('id', capture.id);

    if (error) {
      toast.error('Erreur lors du rejet');
    } else {
      toast.success(`${capture.animal_name} rejeté et supprimé`);
      setCaptures(prev => prev.filter(c => c.id !== capture.id));
    }
    setProcessing(null);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-foreground">Modération</h1>
            <p className="text-xs text-muted-foreground">{captures.length} en attente</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground font-display text-sm">Chargement…</p>
          </div>
        ) : captures.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-muted-foreground font-display">Aucune capture en attente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {captures.map(capture => (
              <div key={capture.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-card">
                <div className="relative aspect-video overflow-hidden">
                  <img src={capture.image_url} alt={capture.animal_name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber/90 text-foreground rounded-full px-2.5 py-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-[10px] font-display font-bold uppercase">En attente</span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="text-base font-display font-bold text-foreground">{capture.animal_name}</h3>
                    {capture.scientific_name && (
                      <p className="text-xs text-muted-foreground italic">{capture.scientific_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Par {capture.user_display_name}</span>
                    <span>·</span>
                    <span>Il y a {timeAgo(capture.created_at)}</span>
                    {capture.location && (
                      <>
                        <span>·</span>
                        <span>{capture.location}</span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => reject(capture)}
                      disabled={processing === capture.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-display font-semibold disabled:opacity-50 hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Rejeter
                    </button>
                    <button
                      onClick={() => approve(capture)}
                      disabled={processing === capture.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
                    >
                      {processing === capture.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approuver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default ModerationPage;
