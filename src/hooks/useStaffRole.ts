import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StaffRole = 'admin' | 'moderator' | null;

/** Admin (superadmin) or moderator; null while loading for `loading`. */
export function useStaffRole(userId: string | undefined) {
  const [state, setState] = useState<{ userId?: string; role: StaffRole }>({ role: null });
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void supabase.from('user_roles').select('role').eq('user_id', userId).in('role', ['admin', 'moderator'])
      .then(({ data }) => {
        if (!alive) return;
        const roles = (data ?? []).map((row) => row.role);
        setState({ userId, role: roles.includes('admin') ? 'admin' : roles.includes('moderator') ? 'moderator' : null });
      });
    return () => { alive = false; };
  }, [userId]);
  const loading = !!userId && state.userId !== userId;
  const role = loading ? null : state.role;
  return { role, loading, isAdmin: role === 'admin', isStaff: role !== null };
}
