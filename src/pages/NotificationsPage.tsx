import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, UserPlus, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: string;
  actor_id: string;
  capture_id: string | null;
  comment_text: string | null;
  read: boolean;
  created_at: string;
  actor?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  capture?: {
    animal_name: string;
    image_url: string;
  };
}

const NotificationsPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const actorIds = [...new Set(data.map((n: any) => n.actor_id))];
        const captureIds = [...new Set(data.filter((n: any) => n.capture_id).map((n: any) => n.capture_id))];

        const [actorsRes, capturesRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', actorIds),
          captureIds.length > 0
            ? supabase.from('captures').select('id, animal_name, image_url').in('id', captureIds)
            : { data: [] },
        ]);

        const actorMap = new Map(
          ((actorsRes as any).data || []).map((p: any) => [p.user_id, p])
        );
        const captureMap = new Map(
          ((capturesRes as any).data || []).map((c: any) => [c.id, c])
        );

        setNotifications(data.map((n: any) => ({
          ...n,
          actor: actorMap.get(n.actor_id) || undefined,
          capture: n.capture_id ? captureMap.get(n.capture_id) || undefined : undefined,
        })));

        // Mark all as read
        const unreadIds = data.filter((n: any) => !n.read).map((n: any) => n.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);
        }
      } else {
        setNotifications([]);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('my-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Notifications</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-2">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display">Chargement…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-muted-foreground font-display">Aucune notification</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Tu seras notifié quand quelqu'un interagit avec tes captures</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map(notif => {
              const isModerationNotif = notif.type === 'capture_approved' || notif.type === 'capture_rejected';
              const actorName = isModerationNotif ? 'Faunex' : (notif.actor?.display_name || notif.actor?.username || 'Quelqu\'un');
              const avatarUrl = isModerationNotif ? null : notif.actor?.avatar_url;
              const isLike = notif.type === 'like';
              const isComment = notif.type === 'comment';
              const isFriendRequest = notif.type === 'friend_request' || notif.type === 'new_follower';
              const isFriendAccepted = notif.type === 'friend_accepted';
              const isCaptureApproved = notif.type === 'capture_approved';
              const isCaptureRejected = notif.type === 'capture_rejected';

              const iconBg = isCaptureApproved
                ? 'bg-primary'
                : isCaptureRejected
                ? 'bg-destructive'
                : isFriendRequest || isFriendAccepted
                ? 'bg-accent'
                : isLike ? 'bg-destructive' : 'bg-primary';

              const IconComp = isCaptureApproved
                ? CheckCircle
                : isCaptureRejected
                ? XCircle
                : isFriendRequest
                ? UserPlus
                : isFriendAccepted
                ? UserCheck
                : isLike
                ? Heart
                : MessageCircle;

              const message = isCaptureApproved
                ? ` a approuvé ta capture${notif.capture?.animal_name ? ` de ${notif.capture.animal_name}` : ''} ! Elle est maintenant dans ton Faunex 🎉`
                : isCaptureRejected
                ? ` a rejeté ta soumission${notif.comment_text ? ` "${notif.comment_text}"` : ''}. L'animal n'a pas pu être vérifié.`
                : isFriendRequest
                ? ' s\'est abonné(e) à ton profil'
                : isFriendAccepted
                ? ' a accepté ta demande d\'ami'
                : isLike
                ? ' a aimé ta capture'
                : ' a commenté ta capture';

              return (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (isFriendRequest || isFriendAccepted) {
                      navigate('/explorers');
                    } else if (notif.capture_id) {
                      navigate(`/?capture=${notif.capture_id}`);
                    }
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors w-full text-left ${
                    !notif.read ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-display font-bold text-primary overflow-hidden">
                      {isModerationNotif ? (
                        <span className="text-lg">🌿</span>
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        actorName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${iconBg}`}>
                      <IconComp className="w-3 h-3 text-primary-foreground fill-current" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-display font-semibold">{actorName}</span>
                      <span className="text-foreground/70">{message}</span>
                      {notif.capture && (
                        <span className="font-display font-semibold text-primary"> {notif.capture.animal_name}</span>
                      )}
                    </p>
                    {isComment && notif.comment_text && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                        « {notif.comment_text} »
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notif.created_at)}</p>
                  </div>

                  {/* Capture thumbnail */}
                  {notif.capture && (
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={notif.capture.image_url}
                        alt={notif.capture.animal_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default NotificationsPage;
