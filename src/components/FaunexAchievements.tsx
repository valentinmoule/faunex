import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BadgesSection from '@/components/BadgesSection';
import QuestsInline from '@/components/QuestsInline';
import XpParticles from '@/components/XpParticles';

interface ProgressProfile {
  level: number;
  regions_explored: number;
}

const FaunexAchievements = () => {
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProgressProfile | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showXpParticles, setShowXpParticles] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('level, regions_explored')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (data) setProfile(data as ProgressProfile);
  }, [session?.user?.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleBadgeClaimed = useCallback(() => {
    setShowXpParticles(true);
    setRefreshKey((key) => key + 1);
    void loadProfile();
  }, [loadProfile]);

  if (!session?.user?.id || !profile) return null;

  return (
    <div className="space-y-7">
      <XpParticles active={showXpParticles} onComplete={() => setShowXpParticles(false)} />
      <QuestsInline />
      <BadgesSection
        userId={session.user.id}
        level={profile.level}
        regionsExplored={profile.regions_explored}
        refreshKey={refreshKey}
        onClaimed={handleBadgeClaimed}
      />
    </div>
  );
};

export default FaunexAchievements;