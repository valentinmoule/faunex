import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, PawPrint, Bird, Fish, Bug, Turtle, Rabbit, Shell, Waves, MapPin, Plus, Search, Trash2, X, type LucideIcon } from 'lucide-react';
import { type Rarity, type AnimalCard, RARITY_LABELS } from '@/data/mockData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CardDetailSheet from '@/components/CardDetailSheet';
import { consumePendingShelve, peekPendingShelve, type PendingShelve } from '@/lib/shelveAnimation';
import { DEPARTEMENTS, getDepartement } from '@/data/departements';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

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
  const [pendingShelve, setPendingShelveState] = useState<PendingShelve | null>(null);
  const [flyingCardStyle, setFlyingCardStyle] = useState<React.CSSProperties | null>(null);
  const [flashSlotName, setFlashSlotName] = useState<string | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shelveAnimationRan = useRef(false);

  // Departments
  const [subscribedDepts, setSubscribedDepts] = useState<string[]>([]);
  const [animalsByDept, setAnimalsByDept] = useState<Record<string, Set<string>>>({});
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [loadingDept, setLoadingDept] = useState(false);

  const loadDeptAnimals = async (code: string) => {
    const { data } = await supabase
      .from('animal_departments')
      .select('animal_name')
      .eq('department_code', code);
    const set = new Set<string>((data || []).map((r: any) => r.animal_name.toLowerCase()));
    setAnimalsByDept((prev) => ({ ...prev, [code]: set }));
    return set;
  };

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

  // Detect pending shelve animation request on mount
  useEffect(() => {
    const peeked = peekPendingShelve();
    if (peeked && !shelveAnimationRan.current) {
      setPendingShelveState(peeked);
    }
  }, []);

  // Auto-open the target category as soon as data is ready
  useEffect(() => {
    if (!pendingShelve || loading || shelveAnimationRan.current) return;
    const targetCat = normalizeCategory(pendingShelve.category);
    // Find the animal entry to confirm category exists
    const match = animals.find(
      a => a.name.toLowerCase() === pendingShelve.animalName.toLowerCase(),
    );
    const catName = match ? normalizeCategory(match.category) : targetCat;
    if (selectedCategory !== catName) {
      setSelectedCategory(catName);
    }
  }, [pendingShelve, loading, animals, selectedCategory]);

  // Play the glide-into-slot animation once the slot is mounted
  useEffect(() => {
    if (!pendingShelve || shelveAnimationRan.current) return;
    if (!selectedCategory) return;

    const slotKey = pendingShelve.animalName.toLowerCase();
    // Wait next frame to ensure slot is rendered
    const raf = requestAnimationFrame(() => {
      const slotEl = slotRefs.current[slotKey];
      if (!slotEl) return;
      shelveAnimationRan.current = true;
      consumePendingShelve(); // clear storage so it doesn't replay

      // Scroll the slot into view (centered)
      slotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // After scroll settles, measure & launch flying card
      setTimeout(() => {
        const rect = slotEl.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Start: large card at center of viewport
        const startSize = Math.min(280, vw * 0.7);
        const startLeft = (vw - startSize) / 2;
        const startTop = (vh - startSize) / 2;

        // Mount flying card at start position
        setFlyingCardStyle({
          left: `${startLeft}px`,
          top: `${startTop}px`,
          width: `${startSize}px`,
          height: `${startSize}px`,
          transform: 'rotate(-4deg) scale(1)',
          opacity: 1,
        });

        // Next frame: animate to slot position
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setFlyingCardStyle({
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              transform: 'rotate(0deg) scale(1)',
              opacity: 1,
            });
          });
        });

        // When animation completes: trigger flash + remove flying card
        setTimeout(() => {
          setFlashSlotName(slotKey);
          setFlyingCardStyle(prev => prev ? { ...prev, opacity: 0 } : null);
          if (navigator.vibrate) navigator.vibrate([30, 20, 60]);
          setTimeout(() => {
            setFlyingCardStyle(null);
            setPendingShelveState(null);
          }, 250);
          // Clear flash after animation
          setTimeout(() => setFlashSlotName(null), 1200);
        }, 900);
      }, 450);
    });

    return () => cancelAnimationFrame(raf);
  }, [pendingShelve, selectedCategory, animals, loading]);

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
                const CatIcon = getCategoryIcon(cat.name);
                const progress = cat.total > 0 ? Math.round((cat.captured / cat.total) * 100) : 0;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-all active:scale-[0.97] hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="mb-2">
                      <CatIcon className="w-7 h-7 text-primary" strokeWidth={1.75} />
                    </div>
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
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {(() => {
                const HeaderIcon = getCategoryIcon(selectedCategory);
                return <HeaderIcon className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />;
              })()}
              <div className="min-w-0">
                <h1 className="text-lg font-display font-bold text-foreground truncate">
                  {selectedCategory}
                </h1>
                <p className="text-[11px] text-muted-foreground font-display">
                  {catInfo?.captured || 0}/{catInfo?.total || 0} capturés
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-3 pt-3">
        {/* 4x4 TCG binder grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {categoryAnimals.map((animal, index) => {
            const slotKey = animal.name.toLowerCase();
            const isFlashing = flashSlotName === slotKey;
            return (
              <div
                key={animal.name}
                ref={(el) => { slotRefs.current[slotKey] = el; }}
                onClick={() => {
                  if (animal.captured && animal.captureData) {
                    setSelectedCard(animal.captureData);
                  } else {
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
                } ${isFlashing ? 'shelve-slot-flash' : ''}`}
              >
                {animal.captured && animal.captureData ? (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex-1 overflow-hidden relative">
                      <img
                        src={animal.captureData.image}
                        alt={animal.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'}`} />
                    </div>
                    <div className="px-1.5 py-1 bg-card">
                      <p className="text-[9px] font-display font-bold text-foreground truncate leading-tight">{animal.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <span className="text-lg font-display font-bold text-muted-foreground/30">
                      {String(index + 1).padStart(3, '0')}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'} opacity-30`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {categoryAnimals.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-muted-foreground font-display text-sm">Aucune espèce dans cette catégorie</p>
          </div>
        )}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />

      {/* Flying card overlay for shelve animation */}
      {flyingCardStyle && pendingShelve && (
        <div className="shelve-flying-card" style={flyingCardStyle}>
          <img src={pendingShelve.imageUrl} alt={pendingShelve.animalName} />
        </div>
      )}
    </main>
  );
};

export default BestiairePage;
