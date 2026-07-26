import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { BestiaryAnimal, ZoneSub } from '@/lib/bestiary';

interface Options {
  userId: string | undefined;
  animals: BestiaryAnimal[];
  subscribedZones: ZoneSub[];
  setSubscribedZones: React.Dispatch<React.SetStateAction<ZoneSub[]>>;
  loadDeptAnimals: (code: string, sourceAnimals?: BestiaryAnimal[], useFallback?: boolean) => Promise<Set<string>>;
  /** Called once a zone is added/selected so the page can close the picker. */
  onZoneReady: (zoneId: string, source: 'department' | 'city' | 'detect') => void;
}

/** CRUD for territory subscriptions (departments, cities, "chez moi"). */
export const useZoneSubscriptions = ({
  userId,
  animals,
  subscribedZones,
  setSubscribedZones,
  loadDeptAnimals,
  onZoneReady,
}: Options) => {
  const [loadingDept, setLoadingDept] = useState(false);
  const [detectingHome, setDetectingHome] = useState(false);

  const populateFauna = useCallback(
    (code: string) => {
      void supabase.functions
        .invoke('populate-department-fauna', { body: { department_code: code } })
        .then(() => loadDeptAnimals(code, animals));
    },
    [animals, loadDeptAnimals]
  );

  const addDepartment = useCallback(
    async (code: string) => {
      if (!userId) return;
      const existing = subscribedZones.find((z) => z.kind === 'department' && z.departmentCode === code);
      if (existing) {
        onZoneReady(existing.id, 'department');
        return;
      }
      setLoadingDept(true);
      try {
        const { data, error } = await supabase
          .from('user_department_subscriptions')
          .insert({ user_id: userId, department_code: code, kind: 'department' })
          .select('id')
          .single();
        if (error) throw error;
        const newZone: ZoneSub = { id: data.id, kind: 'department', departmentCode: code, cityName: null, cityPostcode: null, isHome: false };
        setSubscribedZones((prev) => [...prev, newZone]);

        await loadDeptAnimals(code, animals);
        populateFauna(code);
        onZoneReady(newZone.id, 'department');
      } catch (e: any) {
        toast.error(e.message || "Erreur lors de l'ajout");
      } finally {
        setLoadingDept(false);
      }
    },
    [userId, subscribedZones, setSubscribedZones, loadDeptAnimals, animals, populateFauna, onZoneReady]
  );

  const addCity = useCallback(
    async (city: { nom: string; codeDepartement: string; codesPostaux: string[] }) => {
      if (!userId) return;
      const postcode = city.codesPostaux?.[0] || '';
      const existing = subscribedZones.find(
        (z) => z.kind === 'city' && z.cityName === city.nom && z.cityPostcode === postcode,
      );
      if (existing) {
        onZoneReady(existing.id, 'city');
        return;
      }
      setLoadingDept(true);
      try {
        const { data, error } = await supabase
          .from('user_department_subscriptions')
          .insert({
            user_id: userId,
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
        populateFauna(city.codeDepartement);
        onZoneReady(newZone.id, 'city');
      } catch (e: any) {
        toast.error(e.message || "Erreur lors de l'ajout");
      } finally {
        setLoadingDept(false);
      }
    },
    [userId, subscribedZones, setSubscribedZones, loadDeptAnimals, animals, populateFauna, onZoneReady]
  );

  const removeZone = useCallback(
    async (zoneId: string) => {
      if (!userId) return;
      if (!confirm('Supprimer cette rubrique ?')) return;
      await supabase
        .from('user_department_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('id', zoneId);
      setSubscribedZones((prev) => prev.filter((z) => z.id !== zoneId));
    },
    [userId, setSubscribedZones]
  );

  const setAsHome = useCallback(
    async (zoneId: string) => {
      if (!userId) return;
      try {
        await supabase
          .from('user_department_subscriptions')
          .update({ is_home: false })
          .eq('user_id', userId)
          .eq('is_home', true);
        const { error } = await supabase
          .from('user_department_subscriptions')
          .update({ is_home: true })
          .eq('user_id', userId)
          .eq('id', zoneId);
        if (error) throw error;
        setSubscribedZones((prev) => prev.map((z) => ({ ...z, isHome: z.id === zoneId })));
        toast.success('Territoire défini comme « Chez moi »');
      } catch (e: any) {
        toast.error(e.message || 'Erreur');
      }
    },
    [userId, setSubscribedZones]
  );

  const detectHome = useCallback(async () => {
    if (!userId) return;
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
      let zone = subscribedZones.find(
        (z) => z.kind === 'city' && z.cityName === commune.nom && z.cityPostcode === postcode,
      );
      if (!zone) {
        const { data: ins, error } = await supabase
          .from('user_department_subscriptions')
          .insert({
            user_id: userId,
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
        await supabase
          .from('user_department_subscriptions')
          .update({ is_home: false })
          .eq('user_id', userId)
          .eq('is_home', true)
          .neq('id', zone.id);
        setSubscribedZones((prev) => [...prev.map((z) => ({ ...z, isHome: false })), zone!]);
        await loadDeptAnimals(commune.codeDepartement, animals);
        populateFauna(commune.codeDepartement);
      } else {
        await setAsHome(zone.id);
      }
      toast.success(`Chez toi : ${commune.nom} 🏠`);
      onZoneReady(zone.id, 'detect');
    } catch (e: any) {
      const msg = e?.code === 1 ? 'Autorise la géolocalisation pour détecter ta zone' : (e?.message || 'Erreur de géolocalisation');
      toast.error(msg);
    } finally {
      setDetectingHome(false);
    }
  }, [userId, subscribedZones, setSubscribedZones, loadDeptAnimals, animals, populateFauna, setAsHome, onZoneReady]);

  return { loadingDept, detectingHome, addDepartment, addCity, removeZone, setAsHome, detectHome };
};
