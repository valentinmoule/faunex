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

export function useSubscription(userId?: string) {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    () => (userId && subCache.has(userId) ? subCache.get(userId) ?? null : null),
  );
  const [loading, setLoading] = useState(() => !(userId && subCache.has(userId)));

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
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
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`subscriptions-${userId}`)
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
    isPremium: computeActive(subscription),
    loading,
    refresh: fetchSubscription,
  };
}
