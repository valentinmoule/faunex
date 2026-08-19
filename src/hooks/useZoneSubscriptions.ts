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
  /** Returns false (and warns the user) when the free collection quota is reached. */
  canAddZone?: () => boolean;
}

/** CRUD for territory subscriptions (departments, cities). */
export const useZoneSubscriptions = ({
  userId,
  animals,
  subscribedZones,
  setSubscribedZones,
  loadDeptAnimals,
  onZoneReady,
  canAddZone,
}: Options) => {
  const [loadingDept, setLoadingDept] = useState(false);

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
      if (canAddZone && !canAddZone()) return;
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
    [userId, subscribedZones, setSubscribedZones, loadDeptAnimals, animals, populateFauna, onZoneReady, canAddZone]
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
      if (canAddZone && !canAddZone()) return;
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
    [userId, subscribedZones, setSubscribedZones, loadDeptAnimals, animals, populateFauna, onZoneReady, canAddZone]
  );

  const removeZone = useCallback(
    async (zoneId: string) => {
      if (!userId) return;
      await supabase
        .from('user_department_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('id', zoneId);
      setSubscribedZones((prev) => prev.filter((z) => z.id !== zoneId));
    },
    [userId, setSubscribedZones]
  );

  return { loadingDept, addDepartment, addCity, removeZone };
};
