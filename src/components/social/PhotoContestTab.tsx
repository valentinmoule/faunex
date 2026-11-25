import { notifyXpChanged } from '@/lib/xpEvents';
// ============= Full file contents =============

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Vote } from 'lucide-react';
import contestFox from '@/assets/learning/fox-photo-anim.webp';
import contestFoxStill from '@/assets/learning/fox-photo-still.webp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PremiumAvatar } from '@/components/PremiumAvatar';
import RarityBadge from '@/components/RarityBadge';
import TimeLeftBadge from '@/components/TimeLeftBadge';
import { thumbUrl } from '@/lib/imageUrl';
import { rarityTileBorder } from '@/lib/bestiary';
import { hapticTap, hapticSuccess } from '@/lib/haptics';
import RewardBurst from '@/components/rewards/RewardBurst';
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
  const [weekCaptures, setWeekCaptures] = useState<WeekCapture[] | null>(null);

  const [deckIdx, setDeckIdx] = useState(0);
  const [xpPop, setXpPop] = useState(false);
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
      supabase.rpc('contest_recent_winners', { p_limit: 20 }),
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
    loadEligible();
    queryClient.invalidateQueries({ queryKey: ['photo-contest-winner-captures'] });
  }, [userId, queryClient]);

  useEffect(() => { load(); }, [load]);

  const [changing, setChanging] = useState(false);
  const loadEligible = async () => {
    if (!userId) return;
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
    setChanging(false);
    load();
  };

  const replaceWith = async (captureId: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('withdraw_contest_photo');
    setBusy(false);
    if (error) { toast.error(t(contestErrorKey(error.message))); return; }
    await submit(captureId);
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
    if (error) {
      toast.error(t(contestErrorKey(error.message)));
      if (/already_voted|voting_closed/.test(error.message)) load();
      return;
    }
    toast.success(t('social.contest.voteDone'));
    hapticSuccess();
    setXpPop(true);
    setTimeout(() => setXpPop(false), 1900);
    notifyXpChanged();
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    setBallot((prev) => prev.map((e) => (e.entry_id === entryId ? { ...e, voted_for: true } : e)));
  };

  const hasVoted = ballot.some((e) => e.voted_for);
  const fmtWeek = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });

  if (loading) return <p className="py-16 text-center font-display text-muted-foreground">{t('social.common.loading')}</p>;

  const onDeckScroll = (el: HTMLDivElement) => {
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : el.clientWidth;
    const i = Math.round(el.scrollLeft / Math.max(1, step));
    if (i !== deckIdx) setDeckIdx(i);
  };

  const eligible = weekCaptures ?? [];
  const showPicker = !myEntry || changing;

  return (
    <div className="space-y-8 pt-2 pb-8">
      {/* Jury : deck horizontal, cartes d'exposition */}
      <section>
        <div className="flex items-center justify-between gap-2 px-4">
          <h2 className="min-w-0 truncate text-xl font-display font-extrabold tracking-tight text-foreground">{t('social.contest.voteTitle')}</h2>
          <VoteCountdown className="shrink-0" />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 px-4">
          <p className="min-w-0 text-sm text-muted-foreground">{hasVoted ? t('social.contest.juryDone') : t('social.contest.juryHint')}</p>
        </div>
        {ballot.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('social.contest.voteEmpty')}</p>
        ) : (<>
          <div onScroll={(ev) => onDeckScroll(ev.currentTarget)} className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[7%] px-[7%] pb-3">
            {ballot.map((e, i) => {
              const author = e.display_name || e.username || t('social.common.anonymous');
              const active = i === deckIdx;
              return (
                <article key={e.entry_id} className={`w-[86%] shrink-0 snap-center transition-[transform,opacity] duration-300 ${active ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-70'}`}>
                  <div className="mb-2.5 flex min-w-0 items-center gap-2.5">
                    <button onClick={() => navigate(`/explorer/${e.user_id}/collection`)}>
                      <PremiumAvatar avatarUrl={e.avatar_url} name={author} size="md" />
                    </button>
                    <div className="min-w-0">
                      <button onClick={() => navigate(`/explorer/${e.user_id}/collection`)} className="block truncate text-sm font-display font-semibold text-foreground hover:underline">{author}</button>
                      <span className="block text-[11px] text-muted-foreground">{t('social.contest.takenBy')}</span>
                    </div>
                  </div>
                  <div
                    role="button"
                    onClick={() => { hapticTap(); openCapture(e.capture_id); }}
                    className={`game-tile relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-card shadow-xl border-[6px] ${rarityTileBorder[e.rarity as Rarity] || 'tile-border-plain border-border'}`}
                  >
                    <img src={thumbUrl(e.image_url, 800)} alt={speciesName(e.animal_name)} className="absolute inset-0 h-full w-full object-cover" loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
                    <div className="absolute right-3 top-3"><RarityBadge rarity={e.rarity} plain className="feed-card-rarity" /></div>
                    {e.voted_for && (
                      <div className="contest-vote-seal absolute left-3 top-3 flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-accent bg-primary text-primary-foreground shadow-lg">
                        <Check className="h-5 w-5" strokeWidth={3} />
                        <span className="text-[9px] font-display font-extrabold uppercase leading-none tracking-wide">{t('social.contest.voted')}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent p-4 pt-16">
                      <p className="truncate text-lg font-display font-extrabold leading-tight text-background">{speciesName(e.animal_name)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {e.is_mine ? (
                      <Button variant="secondary" size="lg" disabled className="w-full">{t('social.contest.yours')}</Button>
                    ) : e.voted_for ? (
                      <Button size="lg" disabled className="w-full gap-2"><Check className="h-5 w-5" />{t('social.contest.voted')}</Button>
                    ) : (
                      <Button size="lg" disabled={hasVoted || busy} variant={hasVoted ? 'secondary' : 'default'} onClick={() => vote(e.entry_id)} className="game-button w-full gap-2 text-base">
                        <Vote className="h-5 w-5" />{t('social.contest.vote')}{!hasVoted && <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">+5 XP</span>}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {ballot.length <= 12 && (
            <div className="mt-1 flex items-center justify-center gap-1.5" aria-hidden>
              {ballot.map((e, i) => (
                <span key={e.entry_id} className={`h-1.5 rounded-full transition-all ${i === deckIdx ? 'w-5 bg-primary' : e.voted_for ? 'w-1.5 bg-accent' : 'w-1.5 bg-muted'}`} />
              ))}
            </div>
          )}
        </>)}
      </section>

      {/* Ma participation : affiche du prochain concours */}
      <section className="relative mx-4 overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-lg">
        {winners[0]?.image_url && (
          <img src={thumbUrl(winners[0].image_url)} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-150 object-cover opacity-30 blur-2xl" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/85 to-primary" aria-hidden />
        <div className="relative p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-display font-bold uppercase tracking-wide">{t('social.contest.myEntryTitle')}</span>
            {myEntry && <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-display font-bold text-accent-foreground">{t('social.contest.inTheRunning')}</span>}
          </div>
          {!myEntry && (<>
            <h2 className="mt-3 text-2xl font-display font-extrabold leading-tight">{t('social.contest.pitchTitle')}</h2>
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-primary-foreground/90">{t('social.contest.pitchSubtitle')}</p>
              <picture aria-hidden="true">
                <source media="(prefers-reduced-motion: reduce)" srcSet={contestFoxStill} />
                <img src={contestFox} alt="" width={120} height={120} className="fox-fur -my-2 h-[120px] w-[120px] shrink-0 object-contain drop-shadow-lg" />
              </picture>
            </div>
          </>)}
          {myEntry && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-24 shrink-0 rotate-[-3deg] drop-shadow-xl"><Tile image={myEntry.image_url} rarity={myEntry.rarity} name={speciesName(myEntry.animal_name)} onOpen={() => openCapture(myEntry.capture_id)} /></div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-lg font-display font-extrabold">{speciesName(myEntry.animal_name)}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setChanging((v) => !v)} disabled={busy}>{t('social.contest.change')}</Button>
                  <Button variant="ghost" size="sm" onClick={withdraw} disabled={busy} className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">{t('social.contest.withdraw')}</Button>
                </div>
              </div>
            </div>
          )}
        {showPicker && (
          weekCaptures === null ? (
            <p className="py-4 text-center text-sm text-primary-foreground/80">{t('social.common.loading')}</p>
          ) : eligible.length === 0 ? (
            <Button size="lg" variant="secondary" onClick={() => navigate('/capture')} className="game-button mt-4 w-full text-base">{t('social.contest.pitchCta')}</Button>
          ) : (<>
            <p className="mt-4 text-xs font-display font-bold uppercase tracking-wide text-primary-foreground/80">{t('social.contest.pickInline')}</p>
            <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
              {eligible.map((c) => (
                <button key={c.id} disabled={busy} onClick={() => { hapticTap(); myEntry ? replaceWith(c.id) : submit(c.id); }} className="w-24 shrink-0 text-left transition-transform active:scale-[0.96]">
                  <Tile image={c.image_url} rarity={c.rarity} name={speciesName(c.animal_name)} />
                </button>
              ))}
            </div>
          </>)
        )}
        </div>
      </section>

      {/* Panthéon des primées */}
      {winners.length > 0 && (
        <section>
          <h2 className="px-4 text-base font-display font-bold text-foreground">{t('social.contest.allWinnersTitle')}</h2>
          <div className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-2">
            {winners.map((w) => {
              const author = w.display_name || w.username || t('social.common.anonymous');
              return (
                <div key={`${w.week_start}-${w.capture_id}`} className="w-44 shrink-0 snap-start space-y-2">
                  <Tile image={w.image_url} rarity={w.rarity} name={speciesName(w.animal_name)} frameless onOpen={() => openCapture(w.capture_id)} />
                  <button onClick={() => navigate(`/explorer/${w.user_id}/collection`)} className="flex w-full min-w-0 items-center gap-2">
                    <PremiumAvatar avatarUrl={w.avatar_url} name={author} size="sm" />
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-xs font-display font-semibold text-foreground">{author}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{t('social.contest.weekOf', { date: fmtWeek(w.week_start) })} · {t('social.contest.votesCount', { count: w.votes })}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {xpPop && <RewardBurst xp={5} />}
      <CardDetailSheet card={detailCard} open={!!detailCard} onClose={() => setDetailCard(null)} />
    </div>
  );
}
