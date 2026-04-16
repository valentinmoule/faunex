import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, PawPrint, Bird, Fish, Bug, Turtle, Rabbit, Shell, Waves, type LucideIcon } from 'lucide-react';
import { type Rarity, type AnimalCard, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CardDetailSheet from '@/components/CardDetailSheet';

interface BestiaryAnimal {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string;
  captured: boolean;
  captureData?: AnimalCard;
}

const getCategoryIcon = (category: string): LucideIcon => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return Bird;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish;
  if (cat.includes('insecte')) return Bug;
  if (cat.includes('reptile')) return Turtle;
  if (cat.includes('amphibien')) return Rabbit;
  if (cat.includes('arachnide')) return Bug;
  if (cat.includes('crustacé')) return Shell;
  if (cat.includes('mollusque')) return Shell;
  if (cat.includes('mammifère') && cat.includes('marin')) return Waves;
  if (cat.includes('mammifère')) return PawPrint;
  return PawPrint;
};

const getCategoryEmoji = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return '🐦';
  if (cat.includes('poisson') || cat.includes('vie marine')) return '🐟';
  if (cat.includes('insecte')) return '🦋';
  if (cat.includes('reptile')) return '🦎';
  if (cat.includes('amphibien')) return '🐸';
  if (cat.includes('arachnide')) return '🕷️';
  if (cat.includes('crustacé')) return '🦀';
  if (cat.includes('mollusque')) return '🐌';
  if (cat.includes('mammifère') && cat.includes('marin')) return '🐋';
  if (cat.includes('mammifère')) return '🦊';
  return '🐾';
};

const rarityBorderColor: Record<string, string> = {
  common: 'border-rarity-common/40',
  rare: 'border-rarity-rare/50',
  epic: 'border-rarity-epic/50',
  mythic: 'border-rarity-mythic/50',
};

const rarityDot: Record<string, string> = {
  common: 'bg-rarity-common',
  rare: 'bg-rarity-rare',
  epic: 'bg-rarity-epic',
  mythic: 'bg-rarity-mythic',
};

const normalizeCategory = (cat: string) => cat.replace(/\s*\(monde\)$/i, '');

const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<BestiaryAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);

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

      // Sort alphabetically
      list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

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

  // Categories with counts
  const categoryData = useMemo(() => {
    const map = new Map<string, { total: number; captured: number }>();
    animals.forEach(a => {
      const norm = normalizeCategory(a.category);
      const entry = map.get(norm) || { total: 0, captured: 0 };
      entry.total++;
      if (a.captured) entry.captured++;
      map.set(norm, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([name, data]) => ({ name, ...data }));
  }, [animals]);

  // Animals for selected category
  const categoryAnimals = useMemo(() => {
    if (!selectedCategory) return [];
    return animals.filter(a => normalizeCategory(a.category) === selectedCategory);
  }, [animals, selectedCategory]);

  const totalCaptured = animals.filter(a => a.captured).length;

  // Category grid view
  if (!selectedCategory) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-display font-bold text-primary">Bestiaire</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-display">
                  {totalCaptured}/{animals.length}
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

        <div className="max-w-lg mx-auto px-4 pt-4">
          {loading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-display">Chargement…</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categoryData.map(cat => {
                const emoji = getCategoryEmoji(cat.name);
                const progress = cat.total > 0 ? Math.round((cat.captured / cat.total) * 100) : 0;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="text-3xl mb-2">{emoji}</div>
                    <h3 className="font-display font-bold text-sm text-foreground leading-tight mb-1 truncate">{cat.name}</h3>
                    <p className="text-[11px] text-muted-foreground font-display mb-3">
                      {cat.captured}/{cat.total} capturés
                    </p>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Category detail: 3x3 binder grid
  const catInfo = categoryData.find(c => c.name === selectedCategory);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-display font-bold text-foreground truncate">
                {getCategoryEmoji(selectedCategory)} {selectedCategory}
              </h1>
              <p className="text-[11px] text-muted-foreground font-display">
                {catInfo?.captured || 0}/{catInfo?.total || 0} capturés
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-3 pt-3">
        {/* 3x3 TCG binder grid */}
        <div className="grid grid-cols-3 gap-2">
          {categoryAnimals.map((animal, index) => (
              <div
              key={animal.name}
              onClick={() => {
                if (animal.captured && animal.captureData) {
                  setSelectedCard(animal.captureData);
                } else {
                  // Show basic info for uncaptured animals
                  setSelectedCard({
                    id: `uncaptured-${animal.name}`,
                    name: animal.name,
                    scientificName: animal.scientific_name || '',
                    image: '',
                    rarity: animal.rarity as Rarity,
                    category: animal.category,
                    description: '',
                    habitat: '',
                    diet: '',
                    conservation: '',
                    funFact: '',
                    discoveredAt: '',
                    location: '',
                  });
                }
              }}
              className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${
                animal.captured
                  ? `${rarityBorderColor[animal.rarity] || 'border-border'} bg-card`
                  : 'border-border/40 bg-muted/30'
              }`}
            >
              {animal.captured && animal.captureData ? (
                // Captured: show photo card
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 overflow-hidden relative">
                    <img
                      src={animal.captureData.image}
                      alt={animal.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Rarity dot */}
                    <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'}`} />
                  </div>
                  <div className="px-1.5 py-1 bg-card">
                    <p className="text-[9px] font-display font-bold text-foreground truncate leading-tight">{animal.name}</p>
                  </div>
                </div>
              ) : (
                // Uncaptured: placeholder with number
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <span className="text-lg font-display font-bold text-muted-foreground/30">
                    {String(index + 1).padStart(3, '0')}
                  </span>
                  {/* Rarity hint dot */}
                  <div className={`w-1.5 h-1.5 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'} opacity-30`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {categoryAnimals.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-muted-foreground font-display text-sm">Aucune espèce dans cette catégorie</p>
          </div>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default BestiairePage;
