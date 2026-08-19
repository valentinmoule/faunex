import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Rarity } from '@/data/mockData';
import { buildRegionalAnimalSet, type BestiaryAnimal, type ZoneSub } from '@/lib/bestiary';
import type { AnimalCard } from '@/data/mockData';

/** Loads the bestiary catalogue, the user's captures, notifications count and zone subscriptions. */
export const useBestiaryData = (userId: string | undefined) => {
  const [animals, setAnimals] = useState<BestiaryAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [subscribedZones, setSubscribedZones] = useState<ZoneSub[]>([]);
  const [animalsByDept, setAnimalsByDept] = useState<Record<string, Set<string>>>({});
  /** Raw approved captures of the user — the single source of truth for "how many captures". */
  const [myCaptures, setMyCaptures] = useState<AnimalCard[]>([]);

  const animalsRef = useRef<BestiaryAnimal[]>([]);
  animalsRef.current = animals;

  const loadDeptAnimals = useCallback(
    async (code: string, sourceAnimals?: BestiaryAnimal[], useFallback = true) => {
      const source = sourceAnimals ?? animalsRef.current;
      const { data } = await supabase
        .from('animal_departments')
        .select('animal_name')
        .eq('department_code', code);
      let set = new Set<string>((data || []).map((r: any) => r.animal_name.toLowerCase()));
      if (set.size === 0 && useFallback && source.length > 0) {
        set = buildRegionalAnimalSet(code, source);
      }
      setAnimalsByDept((prev) => ({ ...prev, [code]: set }));
      return set;
    },
    []
  );

  useEffect(() => {
    if (!userId) return;

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
        .eq('user_id', userId)
        .eq('status', 'approved');

      const toCard = (capture: any): AnimalCard => ({
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
      });

      // One card per distinct species (most recent capture wins)
      const sortedCaptures = (userCaptures || [])
        .slice()
        .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
      const seenSpecies = new Set<string>();
      setMyCaptures(
        sortedCaptures
          .filter((c: any) => {
            const key = (c.animal_name || '').toLowerCase();
            if (seenSpecies.has(key)) return false;
            seenSpecies.add(key);
            return true;
          })
          .map(toCard),
      );


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
          captureData: capture ? toCard(capture) : undefined,
        };
      });

      list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

      setAnimals(list);
      setLoading(false);
      return list;
    };

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    const fetchSubs = async (sourceAnimals: BestiaryAnimal[]) => {
      const { data } = await supabase
        .from('user_department_subscriptions')
        .select('id, department_code, kind, city_name, city_postcode, is_home')
        .eq('user_id', userId)
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
  }, [userId, loadDeptAnimals]);

  // Backfill department fauna once the catalogue is available
  useEffect(() => {
    if (animals.length === 0 || subscribedZones.length === 0) return;
    const uniqueDepts = Array.from(new Set(subscribedZones.map((z) => z.departmentCode)));
    uniqueDepts.forEach((code) => {
      const existing = animalsByDept[code];
      if (!existing || existing.size === 0) {
        loadDeptAnimals(code, animals);
      }
    });
  }, [animals, subscribedZones, animalsByDept, loadDeptAnimals]);

  return {
    animals,
    myCaptures,
    setMyCaptures,
    loading,
    unreadCount,
    subscribedZones,
    setSubscribedZones,
    animalsByDept,
    loadDeptAnimals,
  };
};
