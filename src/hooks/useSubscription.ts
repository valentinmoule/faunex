import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

export interface SubscriptionRow {
  id: string;
  status: string;
  price_id: string;
  product_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

/** Cache mémoire partagé : évite un état "chargement" à chaque montage
 *  (plusieurs composants utilisent ce hook sur une même page). */
const subCache = new Map<string, SubscriptionRow | null>();
// Cache the verified entitlement, not just billing: family/bonus access may have no row.
const accessCache = new Map<string, boolean>();
const pending = new Map<string, Promise<{ subscription: SubscriptionRow | null; access: boolean | undefined; billingOk: boolean }>>();

/** Share only overlapping reads; later refreshes still always revalidate. */
function readSubscription(userId: string, environment: string) {
  const key = `${environment}:${userId}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = Promise.all([
    supabase.from("subscriptions")
      .select("id, status, price_id, product_id, current_period_end, cancel_at_period_end")
      .eq("user_id", userId).eq("environment", environment)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc('my_premium_access'),
  ]).then(([billing, entitlement]) => {
    const subscription = (billing.data as SubscriptionRow | null) ?? null;
    if (!billing.error) subCache.set(userId, subscription);
    const access = entitlement.error ? undefined : entitlement.data === true;
    if (access !== undefined) accessCache.set(userId, access);
    return { subscription, access, billingOk: !billing.error };
  }).finally(() => { pending.delete(key); });
  pending.set(key, request);
  return request;
}

export function useSubscription(userId?: string) {
  const [bonusActive, setBonusActive] = useState(() => userId ? accessCache.get(userId) ?? false : false);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    () => (userId && subCache.has(userId) ? subCache.get(userId) ?? null : null),
  );
  const [loading, setLoading] = useState(() => Boolean(userId && !accessCache.has(userId)));
  const [resolvedUserId, setResolvedUserId] = useState(userId);
  const activeUser = useRef(userId);
  activeUser.current = userId;

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setBonusActive(false);
      setResolvedUserId(undefined);
      setLoading(false);
      return;
    }
    if (subCache.has(userId)) {
      setSubscription(subCache.get(userId) ?? null);
    }
    if (accessCache.has(userId)) {
      setBonusActive(accessCache.get(userId) ?? false);
      setResolvedUserId(userId);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const result = await readSubscription(userId, getPaddleEnvironment());
      if (activeUser.current !== userId) return;
      if (result.billingOk) setSubscription(result.subscription);
      if (result.access !== undefined) {
        setBonusActive(result.access);
        setResolvedUserId(userId);
        setLoading(false);
      }
    } catch {
      // Retain verified cached access; an unavailable check never revokes it.
    }
  }, [userId]);

  useEffect(() => {
    void fetchSubscription();
    const onFocus=()=>void fetchSubscription();
    window.addEventListener('focus',onFocus);
    const timer=window.setInterval(()=>void fetchSubscription(),60000);
    return ()=>{window.removeEventListener('focus',onFocus);window.clearInterval(timer);};
  }, [fetchSubscription]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      // Suffixe unique : supabase-js déduplique les canaux par nom et
      // renvoie l'ancien canal déjà abonné si l'effet se relance, ce qui
      // faisait planter .on() au démarrage.
      .channel(`subscriptions-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => fetchSubscription()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchSubscription]);

  return {
    subscription,
    isPremium: resolvedUserId === userId && !loading && bonusActive,
    loading: resolvedUserId !== userId || loading,
    refresh: fetchSubscription,
  };
}
