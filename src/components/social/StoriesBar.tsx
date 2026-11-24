import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CollectionStory } from '@/components/PinnedCollectionsCarousel';
import { avatarFallbackStyle } from '@/lib/avatarPalette';
import { avatarThumbUrl, thumbUrl } from '@/lib/imageUrl';
import type { AnimalCard } from '@/data/mockData';
import type { Rarity } from '@/data/mockData';

interface StoryUser { userId: string; name: string; avatar: string | null; cards: AnimalCard[] }

const toCard = (c: any, at: string): AnimalCard => ({
  id: c.id, name: c.animal_name, scientificName: c.scientific_name || '', image: c.image_url,
  subjectBox: c.subject_bbox, rarity: c.rarity as Rarity, category: c.category || '', description: c.description || '',
  habitat: c.habitat || '', diet: c.diet || '', conservation: c.conservation || '', funFact: c.fun_fact || '',
  discoveredAt: at, location: '',
});

/** Bandeau de stories (24 h) en haut du fil Explorateurs. */
export default function StoriesBar({ userId, followingIds, onSelectCard }: { userId: string; followingIds: string[]; onSelectCard: (c: AnimalCard) => void }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<StoryUser[]>([]);
  const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: '', avatar: null });
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [mine, setMine] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const ids = [userId, ...followingIds];
    const { data: stories } = await supabase.from('stories').select('user_id, capture_id, created_at')
      .in('user_id', ids).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true });
    const capIds = [...new Set((stories || []).map((s) => s.capture_id))];
    const [capsRes, profRes] = await Promise.all([
      capIds.length ? supabase.from('captures').select('*').in('id', capIds) : Promise.resolve({ data: [] as any[] }),
      supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', ids),
    ]);
    const caps = new Map(((capsRes as any).data || []).map((c: any) => [c.id, c]));
    const profs = new Map(((profRes as any).data || []).map((p: any) => [p.user_id, p]));
    const p = profs.get(userId) as any;
    setMe({ name: p?.display_name || p?.username || '', avatar: p?.avatar_url || null });
    const grouped = new Map<string, StoryUser>();
    (stories || []).forEach((s) => {
      const c = caps.get(s.capture_id); if (!c) return;
      const pr = profs.get(s.user_id) as any;
      if (!grouped.has(s.user_id)) grouped.set(s.user_id, { userId: s.user_id, name: pr?.display_name || pr?.username || '', avatar: pr?.avatar_url || null, cards: [] });
      grouped.get(s.user_id)!.cards.push(toCard(c, s.created_at));
    });
    const list = [...grouped.values()];
    list.sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : 0));
    setUsers(list);
  }, [userId, followingIds]);

  useEffect(() => { load(); }, [load]);

  const openPicker = async () => {
    setPicking(true); setSelected(new Set());
    const { data } = await supabase.from('captures').select('id, animal_name, image_url').eq('user_id', userId)
      .eq('status', 'approved').order('created_at', { ascending: false }).limit(60);
    setMine(data || []);
  };

  const publish = async () => {
    if (!selected.size) return;
    setSaving(true);
    const { error } = await supabase.from('stories').insert([...selected].map((capture_id) => ({ capture_id, user_id: userId })));
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('social.stories.published'));
    setPicking(false); load();
  };

  const myStory = users.find((u) => u.userId === userId);
  const others = users.filter((u) => u.userId !== userId);
  const ordered = myStory ? [myStory, ...others] : others;
  const open = openIdx !== null ? ordered[openIdx] : null;

  const Bubble = ({ avatar, name, seed, active, onClick, plus }: { avatar: string | null; name: string; seed: string; active: boolean; onClick: () => void; plus?: boolean }) => (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
      <div className="relative">
        <button type="button" onClick={onClick} className={`rounded-full p-[3px] ${active ? 'bg-gradient-to-tr from-accent via-primary to-secondary' : 'bg-border'}`}>
          <span className="block rounded-full bg-background p-[2px]">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full font-display text-xl font-bold" style={avatar ? undefined : avatarFallbackStyle(seed)}>
              {avatar ? <img src={avatarThumbUrl(avatar)} alt="" className="h-full w-full object-cover" /> : (seed || '?').charAt(0).toUpperCase()}
            </span>
          </span>
        </button>
        {plus && (
          <button type="button" onClick={openPicker} aria-label={t('social.stories.add')}
            className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
      </div>
      <span className="w-full truncate text-center text-xs font-semibold text-foreground">{name}</span>
    </div>
  );

  return (
    <>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        <Bubble avatar={me.avatar} name={t('social.stories.you')} seed={me.name} active={!!myStory} plus
          onClick={() => (myStory ? setOpenIdx(0) : openPicker())} />
        {others.map((u) => (
          <Bubble key={u.userId} avatar={u.avatar} name={u.name} seed={u.name} active onClick={() => setOpenIdx(ordered.indexOf(u))} />
        ))}
      </div>

      {open && (
        <CollectionStory
          key={open.userId}
          label={open.userId === userId ? t('social.stories.you') : open.name}
          cover={open.avatar || open.cards[0]?.image || ''}
          subtitle=""
          cards={open.cards}
          onClose={() => setOpenIdx(null)}
          onNextCollection={() => setOpenIdx((i) => (i !== null && i + 1 < ordered.length ? i + 1 : null))}
          onPrevCollection={() => setOpenIdx((i) => (i ? i - 1 : i))}
          onSelectCard={(c) => { setOpenIdx(null); onSelectCard(c); }}
        />
      )}

      <Sheet open={picking} onOpenChange={setPicking}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t('social.stories.pickTitle')}</SheetTitle>
            <p className="text-sm text-muted-foreground">{t('social.stories.pickHint')}</p>
          </SheetHeader>
          {mine.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('social.stories.empty')}</p>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {mine.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => setSelected((s) => { const n = new Set(s); on ? n.delete(c.id) : n.add(c.id); return n; })}
                    className={`relative aspect-[3/4] overflow-hidden rounded-xl ring-2 ${on ? 'ring-primary' : 'ring-transparent'}`}>
                    <img src={thumbUrl(c.image_url, 300, 70)} alt={c.animal_name} className="h-full w-full object-cover" loading="lazy" />
                    {on && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>}
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" disabled={!selected.size || saving} onClick={publish}
            className="sticky bottom-0 mt-4 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground disabled:opacity-50">
            {t('social.stories.publish', { count: selected.size })}
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}
