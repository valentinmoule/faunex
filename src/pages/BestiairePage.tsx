import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MapPin, Compass, Search, BookOpen } from 'lucide-react';
import { type Rarity, type AnimalCard } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import BestiaireNearbyTab from '@/components/bestiaire/BestiaireNearbyTab';
import BestiaireSearchTab from '@/components/bestiaire/BestiaireSearchTab';
import BestiaireExploreTab from '@/components/bestiaire/BestiaireExploreTab';
import BestiaireGuidesTab from '@/components/bestiaire/BestiaireGuidesTab';

interface BestiaryAnimal {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string;
  captured: boolean;
  captureData?: AnimalCard;
}

const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<BestiaryAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

    const fetchData = async () => {
      setLoading(true);

      let allAnimals: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('animals')
          .select('name, scientific_name, rarity, category')
          .order('name')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (!data || data.length === 0) break;
        allAnimals = allAnimals.concat(data);
        if (data.length < pageSize) break;
        page++;
      }

      const { data: userCaptures } = await supabase
        .from('captures')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'approved');

      const capturesByName = new Map<string, any>();
      (userCaptures || []).forEach((c) => {
        capturesByName.set(c.animal_name.toLowerCase(), c);
      });

      const list: BestiaryAnimal[] = allAnimals.map((a: any) => {
        const capture = capturesByName.get(a.name.toLowerCase());
        return {
          name: a.name,
          scientific_name: a.scientific_name,
          rarity: a.rarity,
          category: a.category,
          captured: !!capture,
          captureData: capture ? {
            id: capture.id,
            name: capture.animal_name,
            scientificName: capture.scientific_name || '',
            image: capture.image_url,
            rarity: capture.rarity as Rarity,
            category: capture.category || '',
            description: capture.description || '',
            habitat: capture.habitat || '',
            diet: capture.diet || '',
            conservation: capture.conservation || '',
            funFact: capture.fun_fact || '',
            discoveredAt: capture.created_at,
            location: capture.location || '',
          } : undefined,
        };
      });

      list.sort((a, b) => {
        if (a.captured !== b.captured) return a.captured ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr');
      });

      setAnimals(list);
      setLoading(false);
    };

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    fetchData();
    fetchUnread();
  }, [session]);

  const discoveredCount = animals.filter((a) => a.captured).length;
  const capturedNames = animals.filter(a => a.captured).map(a => a.name);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-display font-bold text-primary">Bestiaire</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-display">
                {discoveredCount}/{animals.length}
              </span>
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-full hover:bg-muted transition-colors"
              >
                <Bell className="w-5 h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        <Tabs defaultValue="nearby" className="w-full">
          <div className="sticky top-[73px] z-30 bg-background/80 backdrop-blur-xl px-4 pt-2 pb-1">
            <TabsList className="w-full bg-muted/60 rounded-xl h-11 p-1 gap-0.5">
              <TabsTrigger value="nearby" className="flex-1 rounded-lg text-xs font-display font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1.5 px-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline">Autour</span>
              </TabsTrigger>
              <TabsTrigger value="explore" className="flex-1 rounded-lg text-xs font-display font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1.5 px-2">
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline">Explorer</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="flex-1 rounded-lg text-xs font-display font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1.5 px-2">
                <Search className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline">Rechercher</span>
              </TabsTrigger>
              <TabsTrigger value="guides" className="flex-1 rounded-lg text-xs font-display font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1.5 px-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden min-[360px]:inline">Guides</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="nearby" className="mt-0">
            <BestiaireNearbyTab capturedNames={capturedNames} />
          </TabsContent>
          <TabsContent value="explore" className="mt-0">
            <BestiaireExploreTab />
          </TabsContent>
          <TabsContent value="search" className="mt-0">
            <BestiaireSearchTab animals={animals} loading={loading} />
          </TabsContent>
          <TabsContent value="guides" className="mt-0">
            <BestiaireGuidesTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default BestiairePage;
