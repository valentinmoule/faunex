import { useCallback, useRef, useState, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeedCapture {
  id: string; image_url: string; subject_bbox?: { x: number; y: number; w: number; h: number } | null;
  animal_name: string; scientific_name: string; category: string; description: string; habitat: string;
  diet: string; conservation: string; fun_fact: string; rarity: string; caption: string | null;
  created_at: string; user_id: string; likes_count: number; comments_count: number;
  profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}
export interface SearchUser {
  user_id: string; display_name: string | null; username: string | null; avatar_url: string | null;
  level: number; total_captures: number;
}
interface FollowProfile { user_id: string; profile?: SearchUser }
interface FeedState {
  posts: FeedCapture[]; likedPosts: Set<string>; likeCounts: Record<string, number>;
  commentCounts: Record<string, number>; milestoneRanks: Record<string, number>;
  followingIds: string[]; offset: number; hasMore: boolean;
}
interface FollowsState {
  following: FollowProfile[]; followers: FollowProfile[]; pendingRequests: FollowProfile[];
  followingIds: Set<string>; pendingIds: Set<string>;
}
export const explorerFeedKey = (uid?: string) => ['explorer-feed', uid] as const;
export const explorerFollowsKey = (uid?: string) => ['explorer-follows', uid] as const;
const PAGE_SIZE = 25;
const emptyFeed: FeedState = { posts: [], likedPosts: new Set(), likeCounts: {}, commentCounts: {}, milestoneRanks: {}, followingIds: [], offset: 0, hasMore: false };
const emptyFollows: FollowsState = { following: [], followers: [], pendingRequests: [], followingIds: new Set(), pendingIds: new Set() };

async function fetchFeedPage(uid: string, followingIds: string[], offset: number): Promise<FeedState> {
  if (!followingIds.length) return { ...emptyFeed, followingIds };
  const { data, error } = await supabase.from('captures').select('*').eq('status', 'approved').eq('shared', true)
    .in('user_id', followingIds).order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  const captures = data ?? [];
  const users = [...new Set(captures.map(c => c.user_id))];
  const ids = captures.map(c => c.id);
  const [profiles, likes, allLikes, comments, milestones] = await Promise.all([
    users.length ? supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', users) : { data: [], error: null },
    ids.length ? supabase.from('feed_likes').select('capture_id').eq('user_id', uid).in('capture_id', ids) : { data: [], error: null },
    ids.length ? supabase.from('feed_likes').select('capture_id').in('capture_id', ids) : { data: [], error: null },
    ids.length ? supabase.from('feed_comments').select('capture_id').in('capture_id', ids) : { data: [], error: null },
    ids.length ? supabase.rpc('capture_milestones', { capture_ids: ids }) : { data: [], error: null },
  ]);
  for (const result of [profiles, likes, allLikes, comments]) if (result.error) throw result.error;
  const profilesById = new Map((profiles.data ?? []).map(p => [p.user_id, p]));
  const counts = (rows: { capture_id: string }[]) => rows.reduce<Record<string, number>>((acc, row) => { acc[row.capture_id] = (acc[row.capture_id] ?? 0) + 1; return acc; }, {});
  const milestoneRanks: Record<string, number> = {};
  for (const row of (milestones.data ?? []) as { capture_id: string; capture_rank: number }[]) milestoneRanks[row.capture_id] = row.capture_rank;
  return {
    posts: captures.map(c => ({ ...c, profiles: profilesById.get(c.user_id) ?? null })) as unknown as FeedCapture[],
    likedPosts: new Set((likes.data ?? []).map(l => l.capture_id)), likeCounts: counts(allLikes.data ?? []),
    commentCounts: counts(comments.data ?? []), milestoneRanks, followingIds,
    offset: offset + captures.length, hasMore: captures.length === PAGE_SIZE,
  };
}

export function useExplorerData(uid?: string) {
  const qc = useQueryClient();
  const currentUser = useRef(uid);
  currentUser.current = uid;
  const [loadingMoreUser, setLoadingMoreUser] = useState<string | null>(null);
  const pendingPage = useRef<string | null>(null);
  const feedKey = explorerFeedKey(uid);
  const followsKey = explorerFollowsKey(uid);
  const feedQuery = useQuery({
    queryKey: feedKey, enabled: !!uid, staleTime: 5 * 60_000, refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!uid) return emptyFeed;
      const { data, error } = await supabase.from('explorer_follows').select('following_id').eq('follower_id', uid).eq('status', 'accepted');
      if (error) throw error;
      return fetchFeedPage(uid, (data ?? []).map(f => f.following_id), 0);
    },
  });
  const followsQuery = useQuery({
    queryKey: followsKey, enabled: !!uid, staleTime: 5 * 60_000, refetchOnWindowFocus: true,
    queryFn: async (): Promise<FollowsState> => {
      if (!uid) return emptyFollows;
      const results = await Promise.all([
        supabase.from('explorer_follows').select('following_id').eq('follower_id', uid).eq('status', 'accepted'),
        supabase.from('explorer_follows').select('follower_id').eq('following_id', uid).eq('status', 'accepted'),
        supabase.from('explorer_follows').select('follower_id').eq('following_id', uid).eq('status', 'pending'),
        supabase.from('explorer_follows').select('following_id').eq('follower_id', uid).eq('status', 'pending'),
      ]);
      for (const result of results) if (result.error) throw result.error;
      const followingIds = (results[0].data ?? []).map(f => f.following_id);
      const followerIds = (results[1].data ?? []).map(f => f.follower_id);
      const pendingIds = (results[2].data ?? []).map(f => f.follower_id);
      const outgoingIds = (results[3].data ?? []).map(f => f.following_id);
      const ids = [...new Set([...followingIds, ...followerIds, ...pendingIds, ...outgoingIds])];
      const profiles = ids.length ? await supabase.from('profiles').select('user_id, display_name, username, avatar_url, level, total_captures').in('user_id', ids) : { data: [], error: null };
      if (profiles.error) throw profiles.error;
      const byId = new Map((profiles.data ?? []).map(p => [p.user_id, p]));
      const list = (userIds: string[]) => userIds.map(user_id => ({ user_id, profile: byId.get(user_id) }));
      return { following: list(followingIds), followers: list(followerIds), pendingRequests: list(pendingIds), followingIds: new Set(followingIds), pendingIds: new Set(outgoingIds) };
    },
  });
  const feed = feedQuery.data ?? emptyFeed;
  const follows = followsQuery.data ?? emptyFollows;
  const setFeedField = <K extends keyof FeedState>(key: K) => (action: SetStateAction<FeedState[K]>) => qc.setQueryData<FeedState>(feedKey, old => {
    if (!old) return old;
    return { ...old, [key]: typeof action === 'function' ? (action as (value: FeedState[K]) => FeedState[K])(old[key]) : action };
  });
  const setFollowsField = <K extends keyof FollowsState>(key: K) => (action: SetStateAction<FollowsState[K]>) => qc.setQueryData<FollowsState>(followsKey, old => {
    if (!old) return old;
    return { ...old, [key]: typeof action === 'function' ? (action as (value: FollowsState[K]) => FollowsState[K])(old[key]) : action };
  });
  const loadMore = useCallback(async (_followingIds: string[], offset: number) => {
    if (!uid || pendingPage.current || feedQuery.isFetching) return;
    const key = explorerFeedKey(uid);
    const snapshot = qc.getQueryData<FeedState>(key);
    if (!snapshot?.hasMore || snapshot.offset !== offset) return;
    pendingPage.current = uid;
    setLoadingMoreUser(uid);
    try {
      const page = await fetchFeedPage(uid, snapshot.followingIds, offset);
      if (currentUser.current !== uid) return;
      qc.setQueryData<FeedState>(key, old => {
        if (!old || old.offset !== offset || old.followingIds !== snapshot.followingIds) return old;
        return { ...page, posts: [...old.posts, ...page.posts], likedPosts: new Set([...old.likedPosts, ...page.likedPosts]), likeCounts: { ...old.likeCounts, ...page.likeCounts }, commentCounts: { ...old.commentCounts, ...page.commentCounts }, milestoneRanks: { ...old.milestoneRanks, ...page.milestoneRanks } };
      });
    } catch { /* Keep the loaded pages; the sentinel can retry on the next visit. */ }
    finally { pendingPage.current = null; setLoadingMoreUser(null); }
  }, [uid, qc, feedQuery.isFetching]);
  const fetchFollows = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: followsKey }), qc.invalidateQueries({ queryKey: feedKey })]);
  };
  return {
    ...follows, posts: feed.posts, likedPosts: feed.likedPosts, likeCounts: feed.likeCounts, commentCounts: feed.commentCounts, milestoneRanks: feed.milestoneRanks,
    feedFollowingIds: feedQuery.data ? feed.followingIds : null, feedOffset: feed.offset, feedHasMore: feed.hasMore,
    feedLoading: feedQuery.isPending, feedLoadingMore: loadingMoreUser === uid, followsLoading: followsQuery.isPending,
    feedError: feedQuery.isError && !feedQuery.data, retryFeed: feedQuery.refetch,
    fetchFeedPage: loadMore, fetchFollows,
    setLikedPosts: setFeedField('likedPosts'), setLikeCounts: setFeedField('likeCounts'), setCommentCounts: setFeedField('commentCounts'),
    setFollowing: setFollowsField('following'), setFollowers: setFollowsField('followers'), setFollowingIds: setFollowsField('followingIds'), setPendingIds: setFollowsField('pendingIds'),
  };
}