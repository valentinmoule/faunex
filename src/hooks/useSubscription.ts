import { useCallback, useEffect, useState } from "react";
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

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

function computeActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const stillInPeriod = end === null || end > Date.now();
  if (ACTIVE_STATUSES.includes(sub.status) && stillInPeriod) return true;
  return sub.status === "canceled" && end !== null && end > Date.now();
}

/** Cache mémoire partagé : évite un état "chargement" à chaque montage
 *  (plusieurs composants utilisent ce hook sur une même page). */
const subCache = new Map<string, SubscriptionRow | null>();
const bonusCache = new Map<string, boolean>();

export function useSubscription(userId?: string) {
  const [bonusActive, setBonusActive] = useState(() => userId ? bonusCache.get(userId) ?? false : false);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    () => (userId && subCache.has(userId) ? subCache.get(userId) ?? null : null),
  );
  const [loading, setLoading] = useState(() => !(userId && subCache.has(userId)));

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setBonusActive(false);
      setLoading(false);
      return;
    }
    if (subCache.has(userId)) {
      setSubscription(subCache.get(userId) ?? null);
      setLoading(false);
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("id, status, price_id, product_id, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .eq("environment", getPaddleEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    subCache.set(userId, (data as SubscriptionRow | null) ?? null);
    setSubscription((data as SubscriptionRow | null) ?? null);
    const { data: rewards } = await supabase.from('referral_rewards').select('starts_at, ends_at')
      .eq('user_id', userId).eq('environment', getPaddleEnvironment())
      .lte('starts_at', new Date().toISOString()).gt('ends_at', new Date().toISOString());
    const activeBonus = Boolean(rewards?.length);
    bonusCache.set(userId, activeBonus);
    setBonusActive(activeBonus);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSubscription();
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
    isPremium: computeActive(subscription) || bonusActive,
    loading,
    refresh: fetchSubscription,
  };
}
