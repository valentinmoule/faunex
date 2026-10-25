import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PremiumAvatar } from '@/components/PremiumAvatar';

interface Liker {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Props {
  captureId: string;
  open: boolean;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

const PAGE_SIZE = 50;

export default function CaptureLikesSheet({ captureId, open, onClose, onViewProfile }: Props) {
  const { t } = useTranslation();
  const [people, setPeople] = useState<Liker[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPeople([]);
    setPage(0);
    setHasMore(false);
  }, [captureId, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    async function load() {
      try {
        const { data: likes, error: likesError } = await supabase
          .from('feed_likes').select('user_id').eq('capture_id', captureId)
          .order('created_at', { ascending: false }).order('id')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (likesError) throw likesError;
        const ids = [...new Set((likes ?? []).map(like => like.user_id))];
        let rows: Liker[] = [];
        if (ids.length) {
          const { data: profiles, error: profilesError } = await supabase.from('profiles')
            .select('user_id, display_name, username, avatar_url').in('user_id', ids);
          if (profilesError) throw profilesError;
          const byId = new Map((profiles ?? []).map(profile => [profile.user_id, profile]));
          rows = ids.flatMap(id => {
            const profile = byId.get(id);
            return profile ? [profile] : [];
          });
        }
        if (cancelled) return;
        setPeople(previous => page === 0 ? rows : [...previous, ...rows.filter(row => !previous.some(person => person.user_id === row.user_id))]);
        setHasMore((likes ?? []).length === PAGE_SIZE);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [captureId, open, page, retry]);

  return (
    <Drawer.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1400] bg-foreground/40 backdrop-blur-sm" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-[1401] flex max-h-[75dvh] flex-col rounded-t-3xl bg-background pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
          <div className="flex items-center justify-between px-5 py-3">
            <Drawer.Title className="font-display text-lg font-semibold text-foreground">{t('capture.detail.likesTitle')}</Drawer.Title>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('common.close')}><X /></Button>
          </div>
          <div className="min-h-24 overflow-y-auto px-5">
            <ul className="divide-y divide-border/60">
              {people.map(person => (
                <li key={person.user_id}>
                  <Button variant="ghost" onClick={() => onViewProfile(person.user_id)} className="h-auto w-full justify-start rounded-none px-0 py-3 text-left whitespace-normal">
                    <PremiumAvatar name={person.display_name || person.username} avatarUrl={person.avatar_url} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{person.display_name || person.username || t('capture.detail.anonymous')}</span>
                      {person.username && <span className="block truncate text-xs font-normal text-muted-foreground">@{person.username.replace(/^@+/, '')}</span>}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
            {loading && <div role="status" aria-label={t('common.loading')} className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
            {error && <div className="py-4 text-center"><p className="mb-2 text-sm text-muted-foreground">{t('capture.detail.likesError')}</p><Button variant="ghost" onClick={() => setRetry(value => value + 1)}>{t('capture.detail.likesRetry')}</Button></div>}
            {!loading && !error && people.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('capture.detail.noLikes')}</p>}
            {!loading && !error && hasMore && <Button variant="ghost" className="w-full" onClick={() => setPage(value => value + 1)}>{t('capture.detail.moreLikes')}</Button>}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}