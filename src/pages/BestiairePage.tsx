import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bell, ChevronLeft, PawPrint, MapPin, Plus, Search, Trash2, X, Building2, Map as MapIcon, Home, Compass, Loader2 } from 'lucide-react';
import { type Rarity, type AnimalCard, RARITY_LABELS } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import CardDetailSheet from '@/components/CardDetailSheet';
import LoadingScreen from '@/components/LoadingScreen';
import { DEPARTEMENTS, getDepartement } from '@/data/departements';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  buildCityAnimalSet,
  getCategoryEmoji,
  getCategoryIcon,
  normalizeCategory,
  rarityBorderColor,
  rarityDot,
  type ZoneSub,
} from '@/lib/bestiary';
import { useBestiaryData } from '@/hooks/useBestiaryData';
import { useCitySearch } from '@/hooks/useCitySearch';
import { useShelveAnimation } from '@/hooks/useShelveAnimation';
import { useZoneSubscriptions } from '@/hooks/useZoneSubscriptions';


interface BestiaryAnimal {
  name: string;
  scientific_name: string | null;
  rarity: string;
  category: string;
  captured: boolean;
  captureData?: AnimalCard;
}

const getCategoryIcon = (category: string): ComponentType<{ className?: string; strokeWidth?: string | number }> => {
  const cat = category.toLowerCase();
  if (cat.includes('oiseau')) return Bird;
  if (cat.includes('poisson') || cat.includes('vie marine')) return Fish;
  if (cat.includes('insecte')) return Bug;
  if (cat.includes('reptile')) return Turtle;
  if (cat.includes('amphibien')) return FrogIcon;
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

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ');

const COASTAL_DEPTS = new Set([
  '06', '11', '13', '14', '17', '22', '29', '30', '33', '34', '35', '40', '44', '50', '56', '59', '62', '64', '66', '76', '80', '83', '85', '2A', '2B', '971', '972', '973', '974', '976',
]);
const MOUNTAIN_DEPTS = new Set(['04', '05', '06', '09', '15', '25', '26', '31', '38', '39', '42', '43', '48', '63', '64', '65', '66', '67', '68', '73', '74', '88', '2A', '2B']);
const MEDITERRANEAN_DEPTS = new Set(['04', '05', '06', '11', '13', '30', '34', '66', '83', '84', '2A', '2B']);
const URBAN_DEPTS = new Set(['59', '69', '75', '92', '93', '94']);
const WETLAND_DEPTS = new Set(['01', '13', '17', '30', '33', '34', '35', '37', '41', '44', '45', '49', '51', '56', '67', '68', '80', '85']);
const OVERSEAS_DEPTS = new Set(['971', '972', '973', '974', '976']);

const BASE_DEPT_KEYWORDS = [
  'abeille', 'bourdon', 'fourmi', 'coccinelle', 'papillon', 'mouche', 'moustique', 'libellule', 'araignée', 'escargot', 'limace',
  'moineau', 'mésange', 'merle', 'rougegorge', 'pigeon', 'pie', 'corneille', 'étourneau', 'hirondelle', 'martinet', 'pinson', 'verdier', 'chardonneret',
  'hérisson', 'écureuil', 'renard', 'chevreuil', 'sanglier', 'lièvre', 'lapin', 'chauve-souris', 'fouine', 'belette', 'mulot', 'campagnol', 'rat', 'souris',
  'grenouille', 'crapaud', 'triton', 'salamandre', 'lézard', 'couleuvre', 'chien', 'chat', 'cheval', 'âne', 'vache', 'mouton', 'chèvre', 'poule', 'canard',
];

const getDeptKeywords = (code: string) => {
  const keywords = [...BASE_DEPT_KEYWORDS];
  if (COASTAL_DEPTS.has(code)) {
    keywords.push('goéland', 'mouette', 'cormoran', 'aigrette', 'héron', 'avocette', 'huîtrier', 'phoque', 'crabe', 'crevette', 'homard', 'moule', 'huître', 'bar', 'dorade', 'sardine', 'anchois', 'méduse', 'oursin', 'balane');
  }
  if (MOUNTAIN_DEPTS.has(code)) {
    keywords.push('aigle', 'vautour', 'marmotte', 'chamois', 'bouquetin', 'isard', 'mouflon', 'lynx', 'loup', 'tétras', 'lagopède', 'truite', 'apollon', 'accenteur alpin');
  }
  if (MEDITERRANEAN_DEPTS.has(code)) {
    keywords.push('flamant', 'cigale', 'gecko', 'tortue', 'lézard ocellé', 'couleuvre', 'rollier', 'guêpier', 'mérou', 'murène', 'dorade', 'sardine', 'anchois', 'scorpion');
  }
  if (URBAN_DEPTS.has(code)) {
    keywords.push('perruche', 'rat', 'souris', 'pigeon', 'moineau', 'martinet', 'corneille', 'pie', 'renard', 'hérisson', 'fouine', 'étourneau');
  }
  if (WETLAND_DEPTS.has(code)) {
    keywords.push('canard', 'cygne', 'foulque', 'grèbe', 'héron', 'aigrette', 'grenouille', 'triton', 'libellule', 'agrion', 'brochet', 'carpe', 'ablette');
  }
  if (OVERSEAS_DEPTS.has(code)) {
    keywords.push('iguane', 'gecko', 'tortue', 'colibri', 'pélican', 'frégate', 'crabe', 'crevette', 'dauphin', 'baleine', 'requin', 'raie', 'mérou', 'perroquet', 'caméléon');
  }
  return keywords.map(normalizeText);
};

const buildRegionalAnimalSet = (code: string, sourceAnimals: BestiaryAnimal[]) => {
  const keywords = getDeptKeywords(code);
  const selected = new Set<string>();
  const localAnimals = sourceAnimals.filter((animal) => !animal.category.toLowerCase().includes('(monde)'));

  localAnimals.forEach((animal) => {
    const normalizedName = normalizeText(animal.name);
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      selected.add(animal.name.toLowerCase());
    }
  });

  const targetSize = OVERSEAS_DEPTS.has(code) ? 90 : 140;
  if (selected.size < targetSize) {
    localAnimals
      .filter((animal) => animal.rarity === 'common')
      .slice(0, targetSize - selected.size)
      .forEach((animal) => selected.add(animal.name.toLowerCase()));
  }

  return selected;
};

// --- City filter: realistic urban/peri-urban subset ---
// Animals commonly observable in/around a French city (parcs, jardins, rues, toits, points d'eau).
const CITY_KEYWORDS = [
  // Oiseaux urbains
  'moineau', 'pigeon', 'tourterelle', 'merle', 'mésange', 'rougegorge', 'rouge-gorge', 'pinson', 'verdier', 'chardonneret', 'serin',
  'martinet', 'hirondelle', 'étourneau', 'pie', 'corneille', 'corbeau freux', 'choucas', 'geai', 'fauvette', 'pouillot',
  'grimpereau', 'sittelle', 'rossignol', 'perruche', 'faucon crécerelle', 'effraie', 'hulotte', 'goéland', 'mouette rieuse',
  'canard colvert', 'cygne', 'foulque', 'héron cendré', 'aigrette', 'cormoran',
  // Mammifères périurbains
  'écureuil', 'hérisson', 'renard', 'fouine', 'chauve-souris', 'pipistrelle', 'mulot', 'campagnol', 'rat', 'souris', 'lapin de garenne', 'belette',
  // Domestiques
  'chien', 'chat', 'cheval', 'âne', 'poule', 'canard', 'lapin', 'cobaye', 'hamster',
  // Insectes & araignées
  'abeille', 'bourdon', 'fourmi', 'coccinelle', 'papillon', 'paon-du-jour', 'citron', 'piéride', 'vulcain', 'belle-dame', 'machaon',
  'mouche', 'moustique', 'guêpe', 'frelon', 'syrphe', 'libellule', 'agrion', 'demoiselle', 'cigale', 'sauterelle', 'criquet',
  'perce-oreille', 'cloporte', 'mille-pattes', 'lépisme', 'punaise', 'gendarme', 'pucerons',
  'araignée', 'épeire', 'pholque', 'opilion',
  // Mollusques & autres
  'escargot', 'limace',
  // Reptiles/amphibiens urbains
  'lézard des murailles', 'gecko', 'orvet', 'crapaud commun', 'grenouille verte', 'triton palmé',
  // Poissons de bassin/parc
  'carpe', 'poisson rouge', 'gardon',
];

const CITY_EXCLUDE_KEYWORDS = [
  'aigle', 'vautour', 'gypaète', 'balbuzard', 'milan', 'circaète',
  'lynx', 'loup', 'ours', 'chamois', 'bouquetin', 'isard', 'marmotte', 'mouflon', 'cerf', 'élan',
  'sanglier', 'chevreuil', 'blaireau',
  'requin', 'baleine', 'dauphin', 'phoque', 'orque', 'cachalot', 'mérou', 'murène', 'raie', 'thon',
  'crabe', 'homard', 'langouste', 'crevette', 'oursin', 'étoile de mer', 'méduse',
  'flamant', 'pélican', 'frégate', 'fou de bassan',
  'tétras', 'lagopède', 'grand-duc', 'gélinotte',
  'salamandre', 'vipère', 'couleuvre',
];

const buildCityAnimalSet = (deptSet: Set<string>, sourceAnimals: BestiaryAnimal[]) => {
  const capturedNames = new Set(
    sourceAnimals.filter((a) => a.captured).map((a) => a.name.toLowerCase()),
  );
  const selected = new Set<string>();

  sourceAnimals.forEach((animal) => {
    const key = animal.name.toLowerCase();
    if (!deptSet.has(key)) return;
    // Always keep what the user has already captured (preserves progression)
    if (capturedNames.has(key)) { selected.add(key); return; }
    const normalized = normalizeText(animal.name);
    if (CITY_EXCLUDE_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)))) return;
    if (CITY_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)))) {
      selected.add(key);
    }
  });

  // Target ~55 animals max for gamification (less = more achievable)
  const TARGET = 55;
  if (selected.size > TARGET) {
    // Prefer commons & rares over epic/mythic when trimming
    const rank: Record<string, number> = { common: 0, rare: 1, epic: 2, mythic: 3 };
    const trimmed = sourceAnimals
      .filter((a) => selected.has(a.name.toLowerCase()))
      .sort((a, b) => (rank[a.rarity] ?? 4) - (rank[b.rarity] ?? 4) || a.name.localeCompare(b.name, 'fr'))
      .slice(0, TARGET)
      .map((a) => a.name.toLowerCase());
    return new Set(trimmed);
  }
  return selected;
};

const BestiairePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<BestiaryAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'mine' | 'categories' | 'territory'>('mine');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
  const [pendingShelve, setPendingShelveState] = useState<PendingShelve | null>(null);
  const [flyingCardStyle, setFlyingCardStyle] = useState<React.CSSProperties | null>(null);
  const [flashSlotName, setFlashSlotName] = useState<string | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shelveAnimationRan = useRef(false);

  // Zones (departments + cities)
  type ZoneSub = {
    id: string;
    kind: 'department' | 'city';
    departmentCode: string;
    cityName: string | null;
    cityPostcode: string | null;
    isHome: boolean;
  };
  const [subscribedZones, setSubscribedZones] = useState<ZoneSub[]>([]);
  const [animalsByDept, setAnimalsByDept] = useState<Record<string, Set<string>>>({});
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'hub' | 'explore'>('hub');
  const [pickerTab, setPickerTab] = useState<'department' | 'city'>('department');
  const [deptSearch, setDeptSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState<Array<{ nom: string; code: string; codeDepartement: string; codesPostaux: string[] }>>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [detectingHome, setDetectingHome] = useState(false);

  const loadDeptAnimals = async (code: string, sourceAnimals = animals, useFallback = true) => {
    const { data } = await supabase
      .from('animal_departments')
      .select('animal_name')
      .eq('department_code', code);
    let set = new Set<string>((data || []).map((r: any) => r.animal_name.toLowerCase()));
    if (set.size === 0 && useFallback && sourceAnimals.length > 0) {
      set = buildRegionalAnimalSet(code, sourceAnimals);
    }
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
            cutoutUrl: (capture as any).cutout_url,
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
      return list;
    };

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    const fetchSubs = async (sourceAnimals: BestiaryAnimal[]) => {
      const { data } = await supabase
        .from('user_department_subscriptions')
        .select('id, department_code, kind, city_name, city_postcode, is_home')
        .eq('user_id', session.user.id)
        .order('is_home', { ascending: false })
        .order('created_at', { ascending: true });
      const zones: ZoneSub[] = (data || []).map((r: any) => ({
        id: r.id,
        kind: (r.kind || 'department') as 'department' | 'city',
        departmentCode: r.department_code,
        cityName: r.city_name,
        cityPostcode: r.city_postcode,
        isHome: !!r.is_home,
      }));
      setSubscribedZones(zones);
      const uniqueDepts = Array.from(new Set(zones.map((z) => z.departmentCode)));
      for (const c of uniqueDepts) loadDeptAnimals(c, sourceAnimals);
    };

    fetchData().then((list) => fetchSubs(list || []));
    fetchUnread();
  }, [session]);

  useEffect(() => {
    if (animals.length === 0 || subscribedZones.length === 0) return;
    const uniqueDepts = Array.from(new Set(subscribedZones.map((z) => z.departmentCode)));
    uniqueDepts.forEach((code) => {
      const existing = animalsByDept[code];
      if (!existing || existing.size === 0) {
        loadDeptAnimals(code, animals);
      }
    });
  }, [animals, subscribedZones, animalsByDept]);

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

  // Animals for selected category (with rarity filter)
  const categoryAnimals = useMemo(() => {
    if (!selectedCategory) return [];
    return animals
      .filter(a => normalizeCategory(a.category) === selectedCategory)
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter);
  }, [animals, selectedCategory, rarityFilter]);

  // Flat list of my own captured animals (with rarity filter), most recent first
  const myCapturedAnimals = useMemo(() => {
    return animals
      .filter(a => a.captured && a.captureData)
      .filter(a => rarityFilter === 'all' || a.rarity === rarityFilter)
      .sort((a, b) => {
        const da = a.captureData?.discoveredAt || '';
        const db = b.captureData?.discoveredAt || '';
        return db.localeCompare(da);
      });
  }, [animals, rarityFilter]);


  const selectedZone = useMemo(
    () => subscribedZones.find((z) => z.id === selectedZoneId) || null,
    [subscribedZones, selectedZoneId],
  );

  // Animals for selected zone (department or city — both use parent department fauna)
  const zoneAnimals = useMemo(() => {
    if (!selectedZone) return [];
    const deptSet = animalsByDept[selectedZone.departmentCode];
    if (!deptSet) return [];
    const set = selectedZone.kind === 'city' ? buildCityAnimalSet(deptSet, animals) : deptSet;
    return animals
      .filter((a) => set.has(a.name.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [animals, animalsByDept, selectedZone]);

  // Progress map keyed by zone id
  const zoneProgress = useMemo(() => {
    const map: Record<string, { total: number; captured: number }> = {};
    subscribedZones.forEach((z) => {
      const deptSet = animalsByDept[z.departmentCode];
      if (!deptSet) { map[z.id] = { total: 0, captured: 0 }; return; }
      const set = z.kind === 'city' ? buildCityAnimalSet(deptSet, animals) : deptSet;
      let total = 0, captured = 0;
      animals.forEach((a) => {
        if (set.has(a.name.toLowerCase())) {
          total++;
          if (a.captured) captured++;
        }
      });
      map[z.id] = { total, captured };
    });
    return map;
  }, [animals, animalsByDept, subscribedZones]);

  const handleAddDept = async (code: string) => {
    if (!session?.user) return;
    const existing = subscribedZones.find((z) => z.kind === 'department' && z.departmentCode === code);
    if (existing) {
      setShowDeptPicker(false);
      setSelectedZoneId(existing.id);
      return;
    }
    setLoadingDept(true);
    try {
      const { data, error } = await supabase
        .from('user_department_subscriptions')
        .insert({ user_id: session.user.id, department_code: code, kind: 'department' })
        .select('id')
        .single();
      if (error) throw error;
      const newZone: ZoneSub = { id: data.id, kind: 'department', departmentCode: code, cityName: null, cityPostcode: null, isHome: false };
      setSubscribedZones((prev) => [...prev, newZone]);

      await loadDeptAnimals(code, animals);
      void supabase.functions.invoke('populate-department-fauna', {
        body: { department_code: code },
      }).then(() => loadDeptAnimals(code, animals));
      setShowDeptPicker(false);
      setDeptSearch('');
      setSelectedZoneId(newZone.id);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'ajout');
    } finally {
      setLoadingDept(false);
    }
  };

  const handleAddCity = async (city: { nom: string; codeDepartement: string; codesPostaux: string[] }) => {
    if (!session?.user) return;
    const postcode = city.codesPostaux?.[0] || '';
    const existing = subscribedZones.find(
      (z) => z.kind === 'city' && z.cityName === city.nom && z.cityPostcode === postcode,
    );
    if (existing) {
      setShowDeptPicker(false);
      setSelectedZoneId(existing.id);
      return;
    }
    setLoadingDept(true);
    try {
      const { data, error } = await supabase
        .from('user_department_subscriptions')
        .insert({
          user_id: session.user.id,
          department_code: city.codeDepartement,
          kind: 'city',
          city_name: city.nom,
          city_postcode: postcode,
        })
        .select('id')
        .single();
      if (error) throw error;
      const newZone: ZoneSub = {
        id: data.id,
        kind: 'city',
        departmentCode: city.codeDepartement,
        cityName: city.nom,
        cityPostcode: postcode,
        isHome: false,
      };
      setSubscribedZones((prev) => [...prev, newZone]);

      await loadDeptAnimals(city.codeDepartement, animals);
      void supabase.functions.invoke('populate-department-fauna', {
        body: { department_code: city.codeDepartement },
      }).then(() => loadDeptAnimals(city.codeDepartement, animals));
      setShowDeptPicker(false);
      setCitySearch('');
      setCityResults([]);
      setSelectedZoneId(newZone.id);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'ajout');
    } finally {
      setLoadingDept(false);
    }
  };

  const handleRemoveZone = async (zoneId: string) => {
    if (!session?.user) return;
    if (!confirm('Supprimer cette rubrique ?')) return;
    await supabase
      .from('user_department_subscriptions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('id', zoneId);
    setSubscribedZones((prev) => prev.filter((z) => z.id !== zoneId));
    setSelectedZoneId(null);
  };

  const handleSetAsHome = async (zoneId: string) => {
    if (!session?.user) return;
    try {
      // Clear previous home, then set new one
      await supabase
        .from('user_department_subscriptions')
        .update({ is_home: false })
        .eq('user_id', session.user.id)
        .eq('is_home', true);
      const { error } = await supabase
        .from('user_department_subscriptions')
        .update({ is_home: true })
        .eq('user_id', session.user.id)
        .eq('id', zoneId);
      if (error) throw error;
      setSubscribedZones((prev) =>
        prev.map((z) => ({ ...z, isHome: z.id === zoneId }))
      );
      toast.success('Territoire défini comme « Chez moi »');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  const handleDetectHome = async () => {
    if (!session?.user) return;
    if (!('geolocation' in navigator)) {
      toast.error('Géolocalisation indisponible');
      return;
    }
    setDetectingHome(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const url = `https://geo.api.gouv.fr/communes?lat=${latitude}&lon=${longitude}&fields=nom,code,codeDepartement,codesPostaux&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const commune = Array.isArray(data) && data[0];
      if (!commune) {
        toast.error('Impossible de détecter ta commune (hors France ?)');
        return;
      }
      const postcode = commune.codesPostaux?.[0] || '';
      // Existing zone match?
      let zone = subscribedZones.find(
        (z) => z.kind === 'city' && z.cityName === commune.nom && z.cityPostcode === postcode,
      );
      if (!zone) {
        const { data: ins, error } = await supabase
          .from('user_department_subscriptions')
          .insert({
            user_id: session.user.id,
            department_code: commune.codeDepartement,
            kind: 'city',
            city_name: commune.nom,
            city_postcode: postcode,
            is_home: true,
          })
          .select('id')
          .single();
        if (error) throw error;
        zone = {
          id: ins.id,
          kind: 'city',
          departmentCode: commune.codeDepartement,
          cityName: commune.nom,
          cityPostcode: postcode,
          isHome: true,
        };
        // Clear previous home
        await supabase
          .from('user_department_subscriptions')
          .update({ is_home: false })
          .eq('user_id', session.user.id)
          .eq('is_home', true)
          .neq('id', zone.id);
        setSubscribedZones((prev) => [
          ...prev.map((z) => ({ ...z, isHome: false })),
          zone!,
        ]);
        await loadDeptAnimals(commune.codeDepartement, animals);
        void supabase.functions.invoke('populate-department-fauna', {
          body: { department_code: commune.codeDepartement },
        }).then(() => loadDeptAnimals(commune.codeDepartement, animals));
      } else {
        await handleSetAsHome(zone.id);
      }
      toast.success(`Chez toi : ${commune.nom} 🏠`);
      setShowDeptPicker(false);
      setPickerMode('hub');
      setSelectedZoneId(zone.id);
    } catch (e: any) {
      const msg = e?.code === 1 ? 'Autorise la géolocalisation pour détecter ta zone' : (e?.message || 'Erreur de géolocalisation');
      toast.error(msg);
    } finally {
      setDetectingHome(false);
    }
  };

  const filteredDeptOptions = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    return DEPARTEMENTS.filter((d) =>
      !q || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.region.toLowerCase().includes(q)
    );
  }, [deptSearch]);

  // Debounced city search via geo.api.gouv.fr
  useEffect(() => {
    if (pickerTab !== 'city') return;
    const q = citySearch.trim();
    if (q.length < 2) { setCityResults([]); return; }
    let cancelled = false;
    setCityLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codeDepartement,codesPostaux&boost=population&limit=20`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setCityResults(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCityResults([]);
      } finally {
        if (!cancelled) setCityLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [citySearch, pickerTab]);

  const totalCaptured = animals.filter(a => a.captured).length;

  const hasHomeZone = subscribedZones.some((z) => z.isHome);

  // Zone picker sheet — hub with presets + explore mode
  const deptPickerSheet = (
    <Sheet
      open={showDeptPicker}
      onOpenChange={(o) => {
        setShowDeptPicker(o);
        if (!o) setPickerMode('hub');
      }}
    >
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {pickerMode === 'explore' && (
              <button
                onClick={() => setPickerMode('hub')}
                className="p-1 -ml-1 rounded-full hover:bg-muted transition"
                aria-label="Retour"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <SheetTitle className="font-display">
              {pickerMode === 'hub' ? 'Ajouter un territoire' : 'Explorer une zone'}
            </SheetTitle>
          </div>
        </SheetHeader>

        {pickerMode === 'hub' && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            <p className="text-xs text-muted-foreground font-display leading-relaxed">
              Suis la faune locale là où tu vis, ou prépare ta prochaine sortie nature.
            </p>

            <button
              onClick={handleDetectHome}
              disabled={detectingHome}
              className="w-full relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-left transition active:scale-[0.98] disabled:opacity-60"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  {detectingHome ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <Home className="w-6 h-6 text-primary" strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-base text-foreground">Chez moi</h3>
                    <span className="text-[9px] font-display font-bold uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                      Auto
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-display leading-relaxed mt-0.5">
                    {hasHomeZone
                      ? 'Mettre à jour ton territoire principal via ta position.'
                      : 'Détecte ta commune et suis la faune autour de toi au quotidien.'}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setPickerMode('explore'); setPickerTab('city'); }}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition active:scale-[0.98] hover:border-primary/30"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Compass className="w-6 h-6 text-foreground" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-foreground">Explorer une zone</h3>
                  <p className="text-[11px] text-muted-foreground font-display leading-relaxed mt-0.5">
                    Prépare un voyage, une rando ou une visite : ajoute n'importe quelle ville ou département.
                  </p>
                </div>
              </div>
            </button>

            <p className="text-[10px] text-muted-foreground font-display text-center pt-2">
              Tu peux ajouter plusieurs territoires et changer ton « Chez moi » à tout moment.
            </p>
          </div>
        )}

        {pickerMode === 'explore' && (
          <>
            <div className="px-5 pt-3 flex gap-2">
              <button
                onClick={() => setPickerTab('department')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-display font-semibold transition ${
                  pickerTab === 'department' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" strokeWidth={2} />
                Département
              </button>
              <button
                onClick={() => setPickerTab('city')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-display font-semibold transition ${
                  pickerTab === 'city' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" strokeWidth={2} />
                Ville
              </button>
            </div>
            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  key={pickerTab}
                  autoFocus
                  type="text"
                  value={pickerTab === 'department' ? deptSearch : citySearch}
                  onChange={(e) => pickerTab === 'department' ? setDeptSearch(e.target.value) : setCitySearch(e.target.value)}
                  placeholder={pickerTab === 'department' ? 'Rechercher (nom, n° ou région)' : 'Rechercher une ville…'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted border-0 text-sm font-display focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {pickerTab === 'department' && filteredDeptOptions.map((d) => {
                const already = subscribedZones.some((z) => z.kind === 'department' && z.departmentCode === d.code);
                return (
                  <button
                    key={d.code}
                    disabled={loadingDept}
                    onClick={() => handleAddDept(d.code)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition text-left disabled:opacity-50"
                  >
                    <span className="w-10 text-xs font-display font-bold text-muted-foreground tabular-nums">{d.code}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold text-foreground truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground font-display truncate">{d.region}</p>
                    </div>
                    {already ? (
                      <span className="text-[10px] font-display text-primary">Déjà ajouté</span>
                    ) : (
                      <Plus className="w-4 h-4 text-primary" />
                    )}
                  </button>
                );
              })}
              {pickerTab === 'city' && (
                <>
                  {citySearch.trim().length < 2 && (
                    <p className="text-center text-xs text-muted-foreground font-display py-8 px-4">
                      Tape au moins 2 lettres pour rechercher une commune française.
                    </p>
                  )}
                  {cityLoading && (
                    <p className="text-center text-xs text-muted-foreground font-display py-4">Recherche…</p>
                  )}
                  {!cityLoading && citySearch.trim().length >= 2 && cityResults.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground font-display py-8">Aucune commune trouvée</p>
                  )}
                  {cityResults.map((c) => {
                    const postcode = c.codesPostaux?.[0] || '';
                    const already = subscribedZones.some(
                      (z) => z.kind === 'city' && z.cityName === c.nom && z.cityPostcode === postcode,
                    );
                    return (
                      <button
                        key={c.code}
                        disabled={loadingDept}
                        onClick={() => handleAddCity(c)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition text-left disabled:opacity-50"
                      >
                        <Building2 className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-semibold text-foreground truncate">{c.nom}</p>
                          <p className="text-[11px] text-muted-foreground font-display truncate">
                            {postcode} · {c.codeDepartement}
                          </p>
                        </div>
                        {already ? (
                          <span className="text-[10px] font-display text-primary">Déjà ajouté</span>
                        ) : (
                          <Plus className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );

  if (loading) return <LoadingScreen />;

  // Zone detail view
  if (selectedZone) {
    const dept = getDepartement(selectedZone.departmentCode);
    const prog = zoneProgress[selectedZone.id] || { total: 0, captured: 0 };
    const isCity = selectedZone.kind === 'city';
    const title = isCity ? (selectedZone.cityName || 'Ville') : (dept ? `${dept.name} (${dept.code})` : selectedZone.departmentCode);
    const subtitle = isCity
      ? `${selectedZone.cityPostcode || ''}${dept ? ` · ${dept.name}` : ''} · ${prog.captured}/${prog.total} capturés`
      : `${prog.captured}/${prog.total} capturés`;
    const HeaderIcon = selectedZone.isHome ? Home : (isCity ? Building2 : MapPin);
    return (
      <main className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedZoneId(null)}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <HeaderIcon className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-lg font-display font-bold text-foreground truncate">{title}</h1>
                    {selectedZone.isHome && (
                      <span className="text-[9px] font-display font-bold uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">
                        Chez moi
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-display truncate">{subtitle}</p>
                </div>
              </div>
              {!selectedZone.isHome && (
                <button
                  onClick={() => handleSetAsHome(selectedZone.id)}
                  className="p-2 rounded-full hover:bg-primary/10 text-primary transition"
                  aria-label="Définir comme Chez moi"
                  title="Définir comme Chez moi"
                >
                  <Home className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
              <button
                onClick={() => handleRemoveZone(selectedZone.id)}
                className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition"
                aria-label="Supprimer la rubrique"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-3 pt-3">
          {isCity && (
            <p className="text-[11px] text-muted-foreground font-display text-center mb-3 px-3">
              Espèces présentes dans le territoire de {dept?.name || selectedZone.departmentCode}.
            </p>
          )}
          {zoneAnimals.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-muted-foreground font-display text-sm">
                Aucune espèce répertoriée pour cette zone pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {zoneAnimals.map((animal, index) => (
                <div
                  key={animal.name}
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
                        description: '', habitat: '', diet: '', conservation: '', funFact: '',
                        discoveredAt: '', location: '',
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
                    <div className="w-full h-full flex flex-col">
                      <div className="flex-1 overflow-hidden relative">
                        <img src={animal.captureData.image} alt={animal.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'}`} />
                      </div>
                      <div className="px-1.5 py-1 bg-card">
                        <p className="text-[9px] font-display font-bold text-foreground truncate leading-tight">{animal.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <span className="text-lg font-display font-bold text-muted-foreground">
                        {String(index + 1).padStart(3, '0')}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${rarityDot[animal.rarity] || 'bg-muted-foreground'} opacity-30`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
        {deptPickerSheet}
      </main>
    );
  }

  // Category grid view
  if (!selectedCategory) {
    return (
      <main className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-display font-bold text-primary">mon faunex</h1>
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

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
          {/* View toggle + rarity filter */}
          <section className="space-y-3">
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border w-full">
              <button
                onClick={() => setViewMode('mine')}
                className={`flex-1 text-xs font-display font-semibold py-2 rounded-full transition-all ${
                  viewMode === 'mine'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Mes captures
              </button>
              <button
                onClick={() => setViewMode('categories')}
                className={`flex-1 text-xs font-display font-semibold py-2 rounded-full transition-all ${
                  viewMode === 'categories'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Catégories
              </button>
              <button
                onClick={() => setViewMode('territory')}
                className={`flex-1 text-xs font-display font-semibold py-2 rounded-full transition-all ${
                  viewMode === 'territory'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Territoires
              </button>
            </div>
            {viewMode !== 'territory' && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
                {(['all', 'common', 'rare', 'epic', 'mythic'] as const).map((r) => {
                  const active = rarityFilter === r;
                  const label = r === 'all' ? 'Toutes' : RARITY_LABELS[r as Rarity];
                  return (
                    <button
                      key={r}
                      onClick={() => setRarityFilter(r)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold border transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                      }`}
                    >
                      {r !== 'all' && (
                        <span className={`w-1.5 h-1.5 rounded-full ${rarityDot[r] || 'bg-muted-foreground'}`} />
                      )}
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {viewMode === 'mine' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">Mes captures</h2>
                <span className="text-[11px] font-display text-muted-foreground tabular-nums">
                  {myCapturedAnimals.length} {myCapturedAnimals.length > 1 ? 'espèces' : 'espèce'}
                </span>
              </div>
              {myCapturedAnimals.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-xs font-display text-muted-foreground px-6">
                    {rarityFilter === 'all'
                      ? "Tu n'as pas encore de capture. Pars en exploration !"
                      : `Aucune capture ${RARITY_LABELS[rarityFilter as Rarity].toLowerCase()} pour l'instant.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {myCapturedAnimals.map((animal) => (
                    <div
                      key={animal.name}
                      onClick={() => animal.captureData && setSelectedCard(animal.captureData)}
                      className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer active:scale-[0.96] ${rarityBorderColor[animal.rarity] || 'border-border'} bg-card`}
                    >
                      <div className="w-full h-full flex flex-col">
                        <div className="flex-1 overflow-hidden relative">
                          <img
                            src={animal.captureData!.image}
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
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {viewMode === 'categories' && (
            <section>
              <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide mb-3">Catégories</h2>
              <div className="grid grid-cols-2 gap-3">
                {categoryData
                  .map(cat => {
                    if (rarityFilter === 'all') return cat;
                    const inCat = animals.filter(
                      a => normalizeCategory(a.category) === cat.name && a.rarity === rarityFilter
                    );
                    return {
                      name: cat.name,
                      total: inCat.length,
                      captured: inCat.filter(a => a.captured).length,
                    };
                  })
                  .filter(cat => cat.total > 0)
                  .map(cat => {
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
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </section>
          )}

          {viewMode === 'territory' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">Mes territoires</h2>
                <button
                  onClick={() => { setPickerMode('hub'); setShowDeptPicker(true); }}
                  className="flex items-center gap-1 text-xs font-display font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </button>
              </div>
              {subscribedZones.length === 0 ? (
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5 space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex w-12 h-12 rounded-2xl bg-primary/15 items-center justify-center">
                      <Home className="w-6 h-6 text-primary" strokeWidth={2} />
                    </div>
                    <h3 className="font-display font-bold text-sm text-foreground">Découvre la faune autour de toi</h3>
                    <p className="text-[11px] text-muted-foreground font-display leading-relaxed px-2">
                      Définis ton « Chez moi » pour suivre les espèces de ta région, ou ajoute une zone avant un voyage ou une sortie nature.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDetectHome}
                      disabled={detectingHome}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-xs transition active:scale-95 disabled:opacity-60"
                    >
                      {detectingHome ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Home className="w-4 h-4" strokeWidth={2.25} />
                      )}
                      Chez moi
                    </button>
                    <button
                      onClick={() => { setPickerMode('explore'); setPickerTab('city'); setShowDeptPicker(true); }}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl bg-card border border-border text-foreground font-display font-semibold text-xs transition active:scale-95 hover:border-primary/40"
                    >
                      <Compass className="w-4 h-4" strokeWidth={2.25} />
                      Explorer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {subscribedZones.map((zone) => {
                    const d = getDepartement(zone.departmentCode);
                    const p = zoneProgress[zone.id] || { total: 0, captured: 0 };
                    const pct = p.total > 0 ? Math.round((p.captured / p.total) * 100) : 0;
                    const isCity = zone.kind === 'city';
                    const ZoneIcon = zone.isHome ? Home : (isCity ? Building2 : MapPin);
                    const title = isCity ? (zone.cityName || 'Ville') : (d?.name || zone.departmentCode);
                    const sub = isCity
                      ? `${zone.cityPostcode || ''}${d ? ` · ${d.name}` : ''}`
                      : zone.departmentCode;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setSelectedZoneId(zone.id)}
                        className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all active:scale-[0.97] hover:shadow-md ${
                          zone.isHome
                            ? 'border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-card'
                            : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        {zone.isHome && (
                          <span className="absolute top-2 right-2 text-[9px] font-display font-bold uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                            Chez moi
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mb-2">
                          <ZoneIcon className="w-5 h-5 text-primary" strokeWidth={1.75} />
                          <span className="text-[10px] font-display font-bold text-muted-foreground tabular-nums truncate">{sub}</span>
                        </div>
                        <h3 className="font-display font-bold text-sm text-foreground leading-tight mb-1 truncate">{title}</h3>
                        <p className="text-[11px] text-muted-foreground font-display mb-3">
                          {p.captured}/{p.total} capturés
                        </p>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </div>
        <CardDetailSheet card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
        {deptPickerSheet}
      </main>
    );
  }

  // Category detail: 3x3 binder grid
  const catInfo = categoryData.find(c => c.name === selectedCategory);

  return (
    <main className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>mon faunex — Toutes les espèces à découvrir · Faunex</title>
        <meta name="description" content="Explore le bestiaire Faunex : +1000 espèces sauvages françaises classées par catégorie et rareté. Découvre la faune autour de toi." />
        <link rel="canonical" href="https://faunex.fr/bestiaire" />
        <meta property="og:title" content="Bestiaire Faunex — +1000 espèces à découvrir" />
        <meta property="og:url" content="https://faunex.fr/bestiaire" />
        <meta property="og:description" content="Catalogue complet de la faune sauvage : oiseaux, mammifères, insectes, reptiles, amphibiens…" />
      </Helmet>
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
                    <span className="text-lg font-display font-bold text-muted-foreground">
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
