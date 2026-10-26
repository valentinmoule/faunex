// ============= Full file contents =============

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import RarityBadge from '@/components/RarityBadge';
import TimeLeftBadge from '@/components/TimeLeftBadge';
import { thumbUrl } from '@/lib/imageUrl';
import { rarityTileBorder } from '@/lib/bestiary';
import { hapticTap } from '@/lib/haptics';
import { useSpeciesName } from '@/hooks/useSpeciesLocale';
import type { AnimalCard, Rarity } from '@/data/mockData';
import CardDetailSheet from '@/components/CardDetailSheet';
import { CollectorEditionMark } from '@/components/social/CollectorEdition';
function parisVoteEnd(now = new Date()): Date {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(now).map((p) => [p.type, p.value]));
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
  const base = Date.UTC(+parts.year, +parts.month - 1, +parts.day + (7 - dow));
  for (const off of [1, 2]) {
    const d = new Date(base - off * 3600000);
    const h = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(d);
    if (h === '00') return d;
  }
  return new Date(base - 3600000);
}

function VoteCountdown({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const left = Math.max(0, parisVoteEnd(new Date(now)).getTime() - now);
  const d = Math.floor(left / 86400000), h = Math.floor(left / 3600000) % 24, m = Math.floor(left / 60000) % 60, sec = Math.floor(left / 1000) % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <TimeLeftBadge
      className={className}
      value={`${d > 0 ? `${d}${t('social.contest.dayShort')} ` : ''}${pad(h)}:${pad(m)}:${pad(sec)}`}
    />
  );
}

import {
  type BallotEntry,
  type ContestWinner,
  contestErrorKey,
  currentContestWeekStart,
} from '@/hooks/usePhotoContest';

interface MyEntry { capture_id: string; image_url: string; animal_name: string; rarity: string }
interface WeekCapture { id: string; image_url: string; animal_name: string; rarity: string }

const Tile = ({ image, rarity, name, children, frameless, onOpen }: { image: string; rarity: string; name: string; children?: React.ReactNode; frameless?: boolean; onOpen?: () => void }) => (
  <div role={onOpen ? 'button' : undefined} onClick={onOpen ? () => { hapticTap(); onOpen(); } : undefined} className={`${onOpen ? 'cursor-pointer active:scale-[0.99] transition-transform ' : ''}game-tile relative block w-full aspect-[4/5] rounded-2xl overflow-hidden bg-card ${frameless ? 'tile-frame-none' : `border-[6px] ${rarityTileBorder[rarity as Rarity] || 'tile-border-plain border-border'}`}`}>
    <img src={thumbUrl(image, 500)} alt={name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
    <div className="absolute top-2 right-2"><RarityBadge rarity={rarity} plain className="feed-card-rarity" /></div>
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 pt-8">
      <p className="flex items-baseline gap-1 text-xs font-display font-bold text-white leading-tight">
        <span className="min-w-0 truncate">{name}</span>
        {frameless && <CollectorEditionMark className="collector-mark--tile shrink-0 text-[10px]" />}
      </p>
    </div>
    {children}
  </div>
);

export default function PhotoContestTab() {
  const { t, i18n } = useTranslation();
  const { speciesName } = useSpeciesName();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [ballot, setBallot] = useState<BallotEntry[]>([]);
  const [winners, setWinners] = useState<ContestWinner[]>([]);
  const [myEntry, setMyEntry] = useState<MyEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [weekCaptures, setWeekCaptures] = useState<WeekCapture[] | null>(null);

  const [detailCard, setDetailCard] = useState<AnimalCard | null>(null);
  const openCapture = async (captureId: string) => {
    const { data: c } = await supabase.from('captures').select('id, animal_name, scientific_name, image_url, subject_bbox, rarity, category, description, habitat, diet, conservation, fun_fact, created_at').eq('id', captureId).maybeSingle();
    if (!c) return;
    setDetailCard({
      id: c.id, name: c.animal_name, scientificName: c.scientific_name || '', image: c.image_url,
      subjectBox: c.subject_bbox as any, rarity: c.rarity as Rarity, category: c.category || '', description: c.description || '',
      habitat: c.habitat || '', diet: c.diet || '', conservation: c.conservation || '',
      funFact: c.fun_fact || '', discoveredAt: c.created_at, location: '',
    });
  };

  const load = useCallback(async () => {
    if (!userId) return;
    const [ballotRes, winnersRes, weekRes, entryRes] = await Promise.all([
      supabase.rpc('contest_ballot'),
      supabase.rpc('contest_recent_winners', { p_limit: 6 }),
      supabase.rpc('contest_week'),
      supabase.from('photo_contest_entries').select('week_start, capture_id, captures(image_url, animal_name, rarity)').eq('user_id', userId).order('week_start', { ascending: false }).limit(1),
    ]);
    setBallot((ballotRes.data as BallotEntry[]) ?? []);
    setWinners((winnersRes.data as ContestWinner[]) ?? []);
    const row: any = entryRes.data?.[0];
    setMyEntry(row && row.week_start === weekRes.data && row.captures
      ? { capture_id: row.capture_id, image_url: row.captures.image_url, animal_name: row.captures.animal_name, rarity: row.captures.rarity }
      : null);
    setLoading(false);
    queryClient.invalidateQueries({ queryKey: ['photo-contest-winner-captures'] });
  }, [userId, queryClient]);

  useEffect(() => { load(); }, [load]);

  const openPicker = async () => {
    if (!userId) return;
    setPickOpen(true);
    setWeekCaptures(null);
    const { data } = await supabase
      .from('captures')
      .select('id, image_url, animal_name, rarity')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .gte('created_at', currentContestWeekStart().toISOString())
      .order('created_at', { ascending: false });
    const ids = (data ?? []).map((c: any) => c.id);
    const { data: entered } = ids.length
      ? await supabase.from('photo_contest_entries').select('capture_id').in('capture_id', ids)
      : { data: [] as { capture_id: string }[] };
    const taken = new Set((entered ?? []).map((e: any) => e.capture_id));
    setWeekCaptures(((data as WeekCapture[]) ?? []).filter((c) => !taken.has(c.id)));
  };

  const submit = async (captureId: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('submit_contest_photo', { p_capture_id: captureId });
    setBusy(false);
    if (error) { toast.error(t(contestErrorKey(error.message))); return; }
    toast.success(t('social.contest.submitted'));
    setPickOpen(false);
    load();
  };

  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('withdraw_contest_photo');
    setBusy(false);
    if (error) { toast.error(t(contestErrorKey(error.message))); return; }
    load();
  };

  const vote = async (entryId: string) => {
    if (busy) return;
    hapticTap();
    setBusy(true);
    const { error } = await supabase.rpc('cast_contest_vote', { p_entry_id: entryId });
    setBusy(false);
    if (error) { toast.error(t(contestErrorKey(error.message))); return; }
    toast.success(t('social.contest.voteDone'));
    setBallot((prev) => prev.map((e) => (e.entry_id === entryId ? { ...e, voted_for: true } : e)));
  };

  const hasVoted = ballot.some((e) => e.voted_for);
  const fmtWeek = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });
  const myWinners = winners.filter((w) => w.user_id === userId);

  if (loading) return <p className="py-16 text-center font-display text-muted-foreground">{t('social.common.loading')}</p>;

  return (
    <div className="space-y-8 px-4 pt-4 pb-6">
      {/* Ma participation */}
      <section className="rounded-3xl border border-border bg-gradient-to-b from-primary/10 via-card to-card p-4">
        <h2 className="text-base font-display font-bold text-foreground">{t('social.contest.myEntryTitle')}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('social.contest.myEntryHint')}</p>
        {myEntry ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="w-24 shrink-0"><Tile image={myEntry.image_url} rarity={myEntry.rarity} name={speciesName(myEntry.animal_name)} onOpen={() => openCapture(myEntry.capture_id)} /></div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm text-muted-foreground">{t('social.contest.submitted')}</p>
              <Button variant="secondary" size="sm" onClick={withdraw} disabled={busy}>{t('social.contest.withdraw')}</Button>
            </div>
          </div>
        ) : (
          <Button className="mt-3 w-full" onClick={openPicker}>{t('social.contest.submit')}</Button>
        )}
      </section>

      {/* Vote */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 px-1 pt-1">
          <h2 className="min-w-0 truncate text-lg font-display font-bold text-foreground">{t('social.contest.voteTitle')}</h2>
          <VoteCountdown className="shrink-0" />
        </div>
        {ballot.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('social.contest.voteEmpty')}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {ballot.map((e) => {
              const author = e.display_name || e.username || t('social.common.anonymous');
              return (
                <div key={e.entry_id} className="space-y-2">
                  <Tile image={e.image_url} rarity={e.rarity} name={speciesName(e.animal_name)} onOpen={() => openCapture(e.capture_id)} />
                  <button onClick={() => navigate(`/explorer/${e.user_id}/collection`)} className="flex min-w-0 items-center gap-2">
                    <PremiumAvatar avatarUrl={e.avatar_url} name={author} size="sm" />
                    <span className="truncate text-xs font-display font-semibold">{author}</span>
                  </button>
                  {e.is_mine ? (
                    <Button variant="secondary" size="sm" disabled className="w-full text-xs">{t('social.contest.yours')}</Button>
                  ) : e.voted_for ? (
                    <Button size="sm" disabled className="w-full gap-1 text-xs"><Check className="h-3.5 w-3.5" />{t('social.contest.voted')}</Button>
                  ) : (
                    <Button size="sm" variant={hasVoted ? 'secondary' : 'default'} disabled={hasVoted || busy} onClick={() => vote(e.entry_id)} className="w-full text-xs">
                      {t('social.contest.vote')}
                    </Button>
                  )}
                  <p className="text-center text-[11px] text-muted-foreground">{t('social.contest.votes', { count: e.vote_count })}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gagnants */}
      {myWinners.length > 0 && (
        <section>
          <h2 className="text-lg font-display font-bold text-foreground">{t('social.contest.winnersTitle')}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {myWinners.map((w) => {
              return (
                <div key={w.week_start} className="space-y-1.5">
                  <Tile image={w.image_url} rarity={w.rarity} name={speciesName(w.animal_name)} frameless onOpen={() => openCapture(w.capture_id)} />
                  <p className="text-[11px] text-muted-foreground">{t('social.contest.weekOf', { date: fmtWeek(w.week_start) })} · {t('social.contest.votes', { count: w.votes })}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Drawer.Root open={pickOpen} onOpenChange={(o) => !o && setPickOpen(false)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[1400] bg-foreground/40 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1401] max-h-[85vh] rounded-t-3xl bg-background pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none">
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted" />
            <Drawer.Title className="px-5 pt-4 text-center font-display text-lg font-bold">{t('social.contest.pickTitle')}</Drawer.Title>
            <Drawer.Description className="sr-only">{t('social.contest.myEntryHint')}</Drawer.Description>
            <div className="max-h-[70vh] overflow-y-auto px-5 pt-4">
              {weekCaptures === null ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('social.common.loading')}</p>
              ) : weekCaptures.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('social.contest.pickEmpty')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {weekCaptures.map((c) => (
                    <button key={c.id} disabled={busy} onClick={() => submit(c.id)} className="text-left active:scale-[0.98] transition-transform">
                      <Tile image={c.image_url} rarity={c.rarity} name={speciesName(c.animal_name)} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      <CardDetailSheet card={detailCard} open={!!detailCard} onClose={() => setDetailCard(null)} />
    </div>
  );
}
