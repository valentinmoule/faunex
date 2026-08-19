import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePremiumUsers(userIds: string[] | undefined) {
  const [premiumIds, setPremiumIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setPremiumIds(new Set());
      return;
    }

    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc("premium_user_ids", {
        p_user_ids: userIds,
      });

      if (cancelled || error) return;

      setPremiumIds(new Set((data || []).map((r: { user_id: string }) => r.user_id)));
    };

    load();
    return () => { cancelled = true; };
  }, [userIds?.join(",")]);

  return premiumIds;
}

