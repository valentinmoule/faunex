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

/** Cache mémoire partagé : évite un état "chargement" à chaque montage
 *  (plusieurs composants utilisent ce hook sur une même page). */
const subCache = new Map<string, SubscriptionRow | null>();

export function useSubscription(userId?: string) {
  const [bonusActive, setBonusActive] = useState(false);
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
    const { data: access, error: accessError } = await supabase.rpc('my_premium_access');
    const activeBonus = !accessError && access === true;
    setBonusActive(activeBonus);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSubscription();
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
    isPremium: !loading && bonusActive,
    loading,
    refresh: fetchSubscription,
  };
}
