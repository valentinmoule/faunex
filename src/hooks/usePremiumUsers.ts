import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

function isActive(sub: {
  status: string;
  current_period_end: string | null;
}): boolean {
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const stillInPeriod = end === null || end > Date.now();
  if (ACTIVE_STATUSES.includes(sub.status) && stillInPeriod) return true;
  return sub.status === "canceled" && end !== null && end > Date.now();
}

export function usePremiumUsers(userIds: string[] | undefined) {
  const [premiumIds, setPremiumIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setPremiumIds(new Set());
      return;
    }

    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id, status, current_period_end")
        .eq("environment", getPaddleEnvironment())
        .in("user_id", userIds);

      if (cancelled) return;

      const active = new Set<string>();
      (data || []).forEach((sub) => {
        if (isActive(sub)) active.add(sub.user_id);
      });
      setPremiumIds(active);
    };

    load();
    return () => { cancelled = true; };
  }, [userIds]);

  return premiumIds;
}
