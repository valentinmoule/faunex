import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  needsUsername: boolean;
  signOut: () => Promise<void>;
  recheckUsername: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  needsUsername: false,
  signOut: async () => {},
  recheckUsername: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);

  const checkUsername = async (user: User) => {
    // Only check for OAuth users (not email/password)
    const provider = user.app_metadata?.provider;
    if (!provider || provider === 'email') {
      setNeedsUsername(false);
      return;
    }

    // Check if the username is still the auto-generated one
    const emailPrefix = user.email?.split('@')[0] || '';
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile && profile.username === `@${emailPrefix}`) {
      setNeedsUsername(true);
    } else {
      setNeedsUsername(false);
    }
  };

  const recheckUsername = async () => {
    if (session?.user) {
      await checkUsername(session.user);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Defer the profile check to avoid Supabase deadlock
        setTimeout(() => checkUsername(session.user), 0);
        // Log sign-in event for analytics (fire-and-forget, deduped per tab/session)
        if (_event === 'SIGNED_IN') {
          setTimeout(() => {
            const key = `lx_login_logged_${session.user.id}_${session.access_token.slice(-8)}`;
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, '1');
              supabase.from('login_events').insert({ user_id: session.user.id }).then(() => {});
            }
          }, 0);
        }
      } else {
        setNeedsUsername(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkUsername(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, needsUsername, signOut, recheckUsername }}>
      {children}
    </AuthContext.Provider>
  );
};
