import { useState, useEffect, useMemo } from 'react';
import { Search, Lock, CheckCircle, PawPrint, Bird, Fish, Bug, Turtle, Rabbit, Shell, Waves, ChevronDown, type LucideIcon } from 'lucide-react';
import { type Rarity, type AnimalCard, RARITY_LABELS } from '@/data/mockData';
import CardDetailSheet from '@/components/CardDetailSheet';

interface BestiaryAnimal {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string;
  captured: boolean;
  captureData?: AnimalCard;
}

const rarityFilters: (Rarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'mythic'];

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

const normalizeCategory = (cat: string) => cat.replace(/\s*\(monde\)$/i, '');

interface Props {
  animals: BestiaryAnimal[];
  loading: boolean;
}

const BestiaireSearchTab = ({ animals, loading }: Props) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('Tous');
  const [displayCount, setDisplayCount] = useState(100);
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(animals.map(a => normalizeCategory(a.category)));
    return ['Tous', ...Array.from(cats).sort()];
  }, [animals]);

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      if (filter !== 'all' && a.rarity !== filter) return false;
      if (categoryFilter !== 'Tous' && normalizeCategory(a.category) !== categoryFilter) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [animals, filter, categoryFilter, search]);

  useEffect(() => { setDisplayCount(100); }, [filter, categoryFilter, search]);

  const visibleAnimals = filtered.slice(0, displayCount);

  return (
    <div className="px-4 pt-3">
      {/* Search + category */}
      <div className="flex items-stretch gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un animal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
          />
        </div>
        <div className="relative w-1/4 min-w-[80px]">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none w-full h-full pl-3 pr-7 rounded-xl text-xs font-display font-semibold bg-muted border-none text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Rarity chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
        <button
          onClick={() => setFilter('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-bold border transition-all duration-300 flex items-center gap-1 active:scale-95 ${
            filter === 'all'
              ? 'bg-foreground/10 text-foreground border-foreground/30 shadow-sm'
              : 'bg-muted text-muted-foreground border-border hover:bg-foreground/5'
          }`}
        >
          Tous
        </button>
        {rarityFilters.filter(r => r !== 'all').map((r) => {
          const isActive = filter === r;
          const colorClasses = r === 'common'
            ? isActive ? 'bg-rarity-common/20 text-rarity-common border-rarity-common/50' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-common/10'
            : r === 'rare'
            ? isActive ? 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare/50' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-rare/10'
            : r === 'epic'
            ? isActive ? 'bg-rarity-epic/20 text-rarity-epic border-rarity-epic/50' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-epic/10'
            : isActive ? 'bg-rarity-mythic/20 text-rarity-mythic border-rarity-mythic/50' : 'bg-muted text-muted-foreground border-border hover:bg-rarity-mythic/10';
          const dot = `bg-rarity-${r}`;
          return (
            <button
              key={r}
              onClick={() => setFilter(filter === r ? 'all' : r)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-bold border transition-all duration-300 flex items-center gap-1 active:scale-95 ${colorClasses}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot} ${isActive ? 'animate-pulse' : ''}`} />
              {RARITY_LABELS[r as Rarity]}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground font-display mb-2">{filtered.length} espèces</p>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground font-display">Chargement…</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visibleAnimals.map((animal) => (
            <div
              key={animal.name}
              onClick={() => animal.captured && animal.captureData && setSelectedCard(animal.captureData)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${
                animal.captured
                  ? 'bg-card border-border cursor-pointer active:bg-muted/50'
                  : 'bg-muted/40 border-border/50'
              }`}
            >
              {(() => {
                const Icon = getCategoryIcon(animal.category);
                return (
                  <div className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center ${
                    animal.captured
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-muted/60 text-muted-foreground/40 border-border/40'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <h3 className={`font-display font-bold text-sm leading-tight truncate ${
                  animal.captured ? 'text-foreground' : 'text-muted-foreground/60'
                }`}>
                  {animal.name}
                </h3>
                <p className={`text-[11px] italic truncate ${
                  animal.captured ? 'text-muted-foreground' : 'text-muted-foreground/30'
                }`}>
                  {animal.captured ? (animal.scientific_name || '—') : '???'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {animal.captured ? (
                  <CheckCircle className="w-4 h-4 text-primary" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                )}
              </div>
            </div>
          ))}

          {displayCount < filtered.length && (
            <button
              onClick={() => setDisplayCount(prev => prev + 100)}
              className="w-full py-3 text-sm font-display font-semibold text-primary hover:bg-muted rounded-xl transition-colors"
            >
              Voir plus ({filtered.length - displayCount} restants)
            </button>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-muted-foreground font-display">Aucun animal trouvé</p>
            </div>
          )}
        </div>
      )}

      <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
};

export default BestiaireSearchTab;
